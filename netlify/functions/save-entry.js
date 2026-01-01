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
  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (request.method !== 'POST' && request.method !== 'PUT') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  try {
    const body = await request.json();

    // Expect:
    // {
    //   userId: 'abc',
    //   bands: [105,106,107],   // each band number
    //   name: 'John',
    //   zone: '3B',
    //   community: 'Zone 3B - ...',
    //   amountPerBand: 50,
    //   edited: true/false,
    //   entryId?: '...'  (for updating existing logical entry – optional)
    // }

    const {
      userId,
      bands,
      name,
      zone,
      community,
      amountPerBand = 50,
      edited = false,
      entryId,
    } = body || {};

    if (!userId || !Array.isArray(bands) || bands.length === 0 || !name || !zone || !community) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const client = await connectToDatabase();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const now = new Date();

    // Each band is a separate document (like your localStorage version)
    const docs = bands.map((bandNo) => ({
      userId,
      bandNo,
      name,
      zone,
      community,
      amount: amountPerBand,
      edited,
      entryGroupId: entryId || null,
      createdAt: now,
      updatedAt: now,
    }));

    // If updating an existing logical entry group, remove old docs for that group first
    if (entryId) {
      await collection.deleteMany({ userId, entryGroupId: entryId });
    }

    const result = await collection.insertMany(docs);

    return new Response(
      JSON.stringify({
        success: true,
        insertedCount: result.insertedCount,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Save error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
};
