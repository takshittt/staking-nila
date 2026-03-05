import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";

// Connect to MongoDB
await mongoose.connect(process.env.MON_URI);

console.log("✅ Connected to MongoDB");
console.log("🔄 Starting migration: Converting numeric fields to strings...\n");

// Get the database
const db = mongoose.connection.db;

// Migrate Stakes collection
console.log("📊 Migrating Stakes collection...");
const stakesCollection = db.collection("stakes");
const stakes = await stakesCollection.find({}).toArray();

let stakesUpdated = 0;
for (const stake of stakes) {
  const updates = {};
  
  if (typeof stake.amount === "number") {
    updates.amount = stake.amount.toString();
  }
  
  if (typeof stake.apy === "number") {
    updates.apy = stake.apy.toString();
  }
  
  if (Object.keys(updates).length > 0) {
    await stakesCollection.updateOne(
      { _id: stake._id },
      { $set: updates }
    );
    stakesUpdated++;
    console.log(`  ✓ Updated stake ${stake.stakeId}: amount=${updates.amount || 'unchanged'}, apy=${updates.apy || 'unchanged'}`);
  }
}

console.log(`✅ Stakes: ${stakesUpdated} records updated\n`);

// Migrate Transactions collection
console.log("📊 Migrating Transactions collection...");
const transactionsCollection = db.collection("transactions");
const transactions = await transactionsCollection.find({}).toArray();

let transactionsUpdated = 0;
for (const tx of transactions) {
  if (typeof tx.amount === "number") {
    await transactionsCollection.updateOne(
      { _id: tx._id },
      { $set: { amount: tx.amount.toString() } }
    );
    transactionsUpdated++;
    console.log(`  ✓ Updated transaction ${tx.txHash}: amount=${tx.amount}`);
  }
}

console.log(`✅ Transactions: ${transactionsUpdated} records updated\n`);

// Migrate Referrals collection
console.log("📊 Migrating Referrals collection...");
const referralsCollection = db.collection("referrals");
const referrals = await referralsCollection.find({}).toArray();

let referralsUpdated = 0;
for (const referral of referrals) {
  if (typeof referral.earnings === "number") {
    await referralsCollection.updateOne(
      { _id: referral._id },
      { $set: { earnings: referral.earnings.toString() } }
    );
    referralsUpdated++;
    console.log(`  ✓ Updated referral ${referral.referrerWallet} -> ${referral.referredWallet}: earnings=${referral.earnings}`);
  }
}

console.log(`✅ Referrals: ${referralsUpdated} records updated\n`);

console.log("🎉 Migration completed successfully!");
console.log(`   Stakes: ${stakesUpdated} updated`);
console.log(`   Transactions: ${transactionsUpdated} updated`);
console.log(`   Referrals: ${referralsUpdated} updated`);

await mongoose.disconnect();
console.log("\n✅ Disconnected from MongoDB");
