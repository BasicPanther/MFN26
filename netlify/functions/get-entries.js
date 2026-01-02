import { MongoClient } from 'mongodb';

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
    const userId = url.searchParams.get('userId') || 'user1';
    
    const client = await connectToDatabase();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Build query based on userId
    let query = {};
    if (userId !== 'all') {
      query = { userId };
    }

    // Get all entries for the query
    const entries = await collection
      .find(query)
      .sort({ bandNo: 1 })
      .toArray();

    return new Response(
      JSON.stringify({
        success: true,
        data: entries.map(e => ({
          ...e,
          _id: e._id.toString(),
        })),
        count: entries.length
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
    console.error('Get entries error:', error);
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
