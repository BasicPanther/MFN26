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
        'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS,PUT',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (request.method !== 'PUT') {
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
    const { id, newBandNo, name, zone, community, amount } = body;

    if (!id || !newBandNo || !name || !zone || !community || !amount) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields'
        }),
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

    // Check if new band number already exists (excluding current entry)
    const existingEntry = await collection.findOne({
      bandNo: newBandNo,
      _id: { $ne: new ObjectId(id) }
    });

    if (existingEntry) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Band number already exists'
        }),
        {
          status: 409,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Update the entry
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          bandNo: newBandNo,
          name,
          zone,
          community,
          amount,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Entry not found'
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Entry updated successfully',
        modifiedCount: result.modifiedCount
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
    console.error('Update error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
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
