import { MongoClient, ObjectId } from 'mongodb';

const mongoUri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'event_bands_db';
const collectionName = process.env.MONGODB_COLLECTION || 'entries';

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
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const userId = url.searchParams.get('userId');

    const client = await connectToDatabase();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Delete all entries if userId='all' (admin clear all)
    if (userId === 'all') {
      const result = await collection.deleteMany({});
      return new Response(
        JSON.stringify({
          success: true,
          deletedCount: result.deletedCount,
          message: 'All entries deleted successfully'
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

    // Delete single entry by ID
    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'ID is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Entry not found'
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
        deletedCount: result.deletedCount,
        message: 'Entry deleted successfully'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  } catch (error) {
    console.error('Delete error:', error);
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
