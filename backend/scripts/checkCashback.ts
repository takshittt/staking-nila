import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkInstantCashback() {
    try {
        console.log('Checking instant cashback rewards...\n');

        // Get all instant cashback rewards
        const rewards = await prisma.pendingReward.findMany({
            where: {
                type: 'INSTANT_CASHBACK'
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        console.log(`Found ${rewards.length} instant cashback rewards:\n`);

        for (const reward of rewards) {
            console.log('---');
            console.log(`ID: ${reward.id}`);
            console.log(`Wallet: ${reward.walletAddress}`);
            console.log(`Amount: ${reward.amount}`);
            console.log(`Status: ${reward.status}`);
            console.log(`SourceId: ${reward.sourceId}`);
            console.log(`ClaimedAt: ${reward.claimedAt}`);
            console.log(`Metadata:`, reward.metadata);
            console.log('');
        }

        // Get all stakes
        const stakes = await prisma.stake.findMany({
            orderBy: {
                createdAt: 'desc'
            },
            take: 5
        });

        console.log(`\nRecent stakes:`);
        for (const stake of stakes) {
            console.log(`- StakeId: ${stake.stakeId}, Amount: ${stake.amount}, Status: ${stake.status}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkInstantCashback();
