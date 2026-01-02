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

  if (request.method !== 'POST') {
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
    const body = await request.text();
    const entry = JSON.parse(body);
    
    const client = await connectToDatabase();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Check for duplicate band numbers
    if (entry.bands && Array.isArray(entry.bands)) {
      const duplicates = [];
      
      for (const bandNo of entry.bands) {
        const existing = await collection.findOne({ bandNo });
        if (existing) {
          duplicates.push({
            bandNo,
            user: existing.userId
          });
        }
      }

      if (duplicates.length > 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Duplicate band numbers found',
            duplicateBands: duplicates
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

      // Insert entries for each band
      const entries = entry.bands.map(bandNo => ({
        bandNo,
        name: entry.name,
        zone: entry.zone,
        community: entry.community,
        amount: entry.amountPerBand || 50,
        userId: entry.userId || 'user1',
        createdAt: new Date(),
      }));

      const result = await collection.insertMany(entries);
      const insertedIds = Object.values(result.insertedIds).map(id => id.toString());

      return new Response(
        JSON.stringify({
          success: true,
          insertedCount: insertedIds.length,
          ids: insertedIds
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Bands array is required'
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Save error:', error);
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