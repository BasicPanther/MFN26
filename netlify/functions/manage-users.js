import { MongoClient } from 'mongodb';

const mongoUri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'event_bands_db';
const usersCollectionName = 'users';
const entriesCollectionName = process.env.MONGODB_COLLECTION || 'entries';

let cachedClient = null;

async function connectToDatabase() {
  if (cachedClient) return cachedClient;
  const client = new MongoClient(mongoUri);
  await client.connect();
  cachedClient = client;
  return client;
}

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    const client = await connectToDatabase();
    const db = client.db(dbName);
    const usersCollection = db.collection(usersCollectionName);

    // GET - Fetch all users
    if (request.method === 'GET') {
      const users = await usersCollection.find({}).toArray();
      
      return new Response(
        JSON.stringify({
          success: true,
          data: users.map(u => ({
            _id: u._id.toString(),
            username: u.username,
            isAdmin: u.isAdmin,
            password: u.password,
            createdAt: u.createdAt
          }))
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // POST - Create new user
    if (request.method === 'POST') {
      const body = await request.json();
      const { username, password } = body;

      if (!username || !password) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Username and password are required'
          }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          }
        );
      }

      // Check if user already exists
      const existingUser = await usersCollection.findOne({ username });
      if (existingUser) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'User already exists'
          }),
          {
            status: 409,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          }
        );
      }

      // Create new user
      const result = await usersCollection.insertOne({
        username,
        password,
        isAdmin: false,
        createdAt: new Date()
      });

      return new Response(
        JSON.stringify({
          success: true,
          id: result.insertedId.toString(),
          message: `User '${username}' created successfully`
        }),
        {
          status: 201,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // DELETE - Remove user and their entries
    if (request.method === 'DELETE') {
      const url = new URL(request.url);
      const username = url.searchParams.get('username');

      if (!username) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Username is required'
          }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          }
        );
      }

      // Prevent deletion of admin user
      if (username === 'admin') {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Cannot delete admin user'
          }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          }
        );
      }

      // Delete user
      const userResult = await usersCollection.deleteOne({ username });

      // Delete all entries for this user
      const entriesCollection = db.collection(entriesCollectionName);
      await entriesCollection.deleteMany({ userId: username });

      if (userResult.deletedCount === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'User not found'
          }),
          {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `User '${username}' and their data deleted successfully`
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Method not allowed'
      }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  } catch (error) {
    console.error('Manage users error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
};
