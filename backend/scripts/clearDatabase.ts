import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDatabase() {
  try {
    console.log('🗑️  Starting database cleanup...\n');

    // Delete in order to respect foreign key constraints
    console.log('Deleting PendingRewards...');
    const pendingRewards = await prisma.pendingReward.deleteMany({});
    console.log(`✅ Deleted ${pendingRewards.count} pending rewards`);

    console.log('Deleting Stakes...');
    const stakes = await prisma.stake.deleteMany({});
    console.log(`✅ Deleted ${stakes.count} stakes`);

    console.log('Deleting Users...');
    const users = await prisma.user.deleteMany({});
    console.log(`✅ Deleted ${users.count} users`);

    console.log('Deleting Referrals...');
    const referrals = await prisma.referral.deleteMany({});
    console.log(`✅ Deleted ${referrals.count} referrals`);

    console.log('Deleting Transactions...');
    const transactions = await prisma.transaction.deleteMany({});
    console.log(`✅ Deleted ${transactions.count} transactions`);

    console.log('Deleting AuditLogs...');
    const auditLogs = await prisma.auditLog.deleteMany({});
    console.log(`✅ Deleted ${auditLogs.count} audit logs`);

    console.log('Deleting ContractCache...');
    const contractCache = await prisma.contractCache.deleteMany({});
    console.log(`✅ Deleted ${contractCache.count} cache entries`);

    console.log('Resetting ReferralConfig...');
    await prisma.referralConfig.deleteMany({});
    console.log('✅ Deleted referral config');

    // Note: Admin table is intentionally NOT cleared to preserve admin credentials
    console.log('\n⚠️  Note: Admin credentials were preserved');

    console.log('\n✨ Database cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearDatabase();
