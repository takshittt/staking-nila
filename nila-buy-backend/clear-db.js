import prisma from "./prisma-client.js";

async function clearDatabase() {
  console.log("🗑️  Starting database cleanup...\n");

  try {
    // Delete in order to respect foreign key constraints
    console.log("Deleting AuditLogs...");
    const auditLogs = await prisma.auditLog.deleteMany({});
    console.log(`✅ Deleted ${auditLogs.count} audit logs`);

    console.log("Deleting PendingRewards...");
    const pendingRewards = await prisma.pendingReward.deleteMany({});
    console.log(`✅ Deleted ${pendingRewards.count} pending rewards`);

    console.log("Deleting Stakes...");
    const stakes = await prisma.stake.deleteMany({});
    console.log(`✅ Deleted ${stakes.count} stakes`);

    console.log("Deleting Users...");
    const users = await prisma.user.deleteMany({});
    console.log(`✅ Deleted ${users.count} users`);

    console.log("Deleting Admins...");
    const admins = await prisma.admin.deleteMany({});
    console.log(`✅ Deleted ${admins.count} admins`);

    console.log("Deleting ContractCache...");
    const contractCache = await prisma.contractCache.deleteMany({});
    console.log(`✅ Deleted ${contractCache.count} contract cache entries`);

    console.log("Deleting Referrals...");
    const referrals = await prisma.referral.deleteMany({});
    console.log(`✅ Deleted ${referrals.count} referrals`);

    console.log("Deleting ReferralConfig...");
    const referralConfig = await prisma.referralConfig.deleteMany({});
    console.log(`✅ Deleted ${referralConfig.count} referral configs`);

    console.log("Deleting Transactions...");
    const transactions = await prisma.transaction.deleteMany({});
    console.log(`✅ Deleted ${transactions.count} transactions`);

    console.log("Deleting PaymentIntents...");
    const paymentIntents = await prisma.paymentIntent.deleteMany({});
    console.log(`✅ Deleted ${paymentIntents.count} payment intents`);

    console.log("Deleting SyncState...");
    const syncState = await prisma.syncState.deleteMany({});
    console.log(`✅ Deleted ${syncState.count} sync states`);

    console.log("Deleting AmountConfigs...");
    const amountConfigs = await prisma.amountConfig.deleteMany({});
    console.log(`✅ Deleted ${amountConfigs.count} amount configs`);

    console.log("Deleting Orders...");
    const orders = await prisma.order.deleteMany({});
    console.log(`✅ Deleted ${orders.count} orders`);

    console.log("Deleting ProcessedTx...");
    const processedTx = await prisma.processedTx.deleteMany({});
    console.log(`✅ Deleted ${processedTx.count} processed transactions`);

    console.log("\n✨ Database cleared successfully!");
  } catch (error) {
    console.error("❌ Error clearing database:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearDatabase();
