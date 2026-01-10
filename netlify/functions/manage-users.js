import { MongoClient, ObjectId } from 'mongodb';

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
        'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS,PUT',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    const client = await connectToDatabase();
    const db = client.db(dbName);
    const usersCollection = db.collection(usersCollectionName);

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
            role: u.role || 'Desk',
            userZone: u.userZone || null,
            createdAt: u.createdAt
          }))
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const { username, password, role, userZone } = body;

      if (!username) return new Response(JSON.stringify({ success: false, error: 'Username required' }), { status: 400 });

      const existingUser = await usersCollection.findOne({ username });
      if (existingUser) return new Response(JSON.stringify({ success: false, error: 'Username already exists' }), { status: 409 });

      const result = await usersCollection.insertOne({
        username,
        password: password || 'olep@2026',
        role: role || 'Desk',
        userZone: userZone || null,
        isAdmin: false,
        createdAt: new Date()
      });
      return new Response(JSON.stringify({ success: true, id: result.insertedId }), { status: 201 });
    }

    if (request.method === 'PUT') {
      const body = await request.json();
      const { id, username, password, role, userZone } = body;

      if (!id) return new Response(JSON.stringify({ success: false, error: 'ID required' }), { status: 400 });

      const updateFields = { updatedAt: new Date() };
      if (username) updateFields.username = username;
      if (password) updateFields.password = password;
      if (role) updateFields.role = role;
      if (userZone !== undefined) updateFields.userZone = userZone;

      await usersCollection.updateOne({ _id: new ObjectId(id) }, { $set: updateFields });
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (request.method === 'DELETE') {
      const url = new URL(request.url);
      const username = url.searchParams.get('username');
      if (username === 'admin') return new Response(JSON.stringify({ success: false, error: 'Cannot delete admin' }), { status: 403 });

      await usersCollection.deleteOne({ username });
      const entriesCollection = db.collection(entriesCollectionName);
      await entriesCollection.deleteMany({ userId: username });

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
};