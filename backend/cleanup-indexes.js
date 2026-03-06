// Cleanup script to remove problematic indexes before Prisma migration
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.DATABASE_URL;

async function cleanupIndexes() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('nila_admin_local');
    
    // Drop problematic unique indexes on orders collection
    const ordersCollection = db.collection('orders');
    
    try {
      await ordersCollection.dropIndex('txHash_1');
      console.log('✅ Dropped old txHash_1 index from orders');
    } catch (err) {
      console.log('⚠️  txHash_1 index not found or already dropped');
    }
    
    try {
      await ordersCollection.dropIndex('orderId_1');
      console.log('✅ Dropped old orderId_1 index from orders');
    } catch (err) {
      console.log('⚠️  orderId_1 index not found or already dropped');
    }
    
    // Drop problematic indexes on transactions collection
    const transactionsCollection = db.collection('transactions');
    
    try {
      await transactionsCollection.dropIndex('txHash_1');
      console.log('✅ Dropped old txHash_1 index from transactions');
    } catch (err) {
      console.log('⚠️  txHash_1 index not found or already dropped');
    }
    
    // Drop problematic indexes on users collection
    const usersCollection = db.collection('users');
    
    try {
      await usersCollection.dropIndex('referralCode_1');
      console.log('✅ Dropped old referralCode_1 index from users');
    } catch (err) {
      console.log('⚠️  referralCode_1 index not found or already dropped');
    }
    
    console.log('\n✅ Cleanup complete! Now run: npx prisma db push');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.close();
  }
}

cleanupIndexes();
