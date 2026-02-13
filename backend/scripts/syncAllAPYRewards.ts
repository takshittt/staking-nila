import { PrismaClient } from '@prisma/client';
import { RewardService } from '../src/services/reward.service';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

/**
 * Sync APY rewards for all users with active stakes
 * Run this script periodically (e.g., daily) via cron job
 */
async function syncAllAPYRewards() {
  console.log('🔄 Starting APY rewards sync for all users...');

  try {
    // Get all unique wallet addresses with active stakes
    const activeStakes = await prisma.stake.findMany({
      where: { status: 'active' },
      select: {
        user: {
          select: { walletAddress: true }
        }
      },
      distinct: ['userId']
    });

    console.log(`📊 Found ${activeStakes.length} users with active stakes`);

    let successCount = 0;
    let errorCount = 0;

    // Sync rewards for each user
    for (const stake of activeStakes) {
      try {
        console.log(`  Syncing rewards for ${stake.user.walletAddress}...`);
        await RewardService.syncAPYRewards(stake.user.walletAddress);
        successCount++;
      } catch (error: any) {
        console.error(`  ❌ Error syncing ${stake.user.walletAddress}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n✅ Sync completed!');
    console.log(`  Success: ${successCount}`);
    console.log(`  Errors: ${errorCount}`);

    // Get summary of pending rewards
    const summary = await RewardService.getAllPendingRewards();
    console.log('\n📈 Pending Rewards Summary:');
    summary.forEach(item => {
      console.log(`  ${item.type} (${item.status}): ${item.totalAmount.toFixed(2)} NILA (${item.count} rewards)`);
    });

  } catch (error: any) {
    console.error('❌ Fatal error during sync:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the sync
syncAllAPYRewards()
  .then(() => {
    console.log('\n✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
