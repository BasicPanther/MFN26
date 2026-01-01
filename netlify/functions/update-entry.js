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
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'PUT,OPTIONS' },
    });
  }

  if (request.method !== 'PUT') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    const body = await request.json();
    const { id, newBandNo, name, zone, community, amount } = body;

    if (!id) {
      return new Response(JSON.stringify({ success: false, error: 'Missing entry ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const client = await connectToDatabase();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // If band number is being changed, check if it already exists
    if (newBandNo) {
      const existing = await collection.findOne({ _id: { $ne: new ObjectId(id) }, bandNo: newBandNo });
      if (existing) {
        return new Response(JSON.stringify({ success: false, error: 'Band number already exists' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    // Build update object with only provided fields
    const updateObj = {};
    if (newBandNo) updateObj.bandNo = newBandNo;
    if (name) updateObj.name = name;
    if (zone) updateObj.zone = zone;
    if (community) updateObj.community = community;
    if (amount) updateObj.amount = amount;
    
    updateObj.updatedAt = new Date();

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateObj }
    );

    return new Response(JSON.stringify({ success: true, modifiedCount: result.modifiedCount }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error) {
    console.error('Update error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
};
