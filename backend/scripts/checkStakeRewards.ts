import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStakeRewardLink() {
    try {
        console.log('Checking stake-reward linkage...\n');

        // Get all stakes with their wallet address
        const stakes = await prisma.stake.findMany({
            include: {
                user: true
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 15
        });

        console.log(`Found ${stakes.length} stakes:\n`);

        for (const stake of stakes) {
            console.log(`StakeId: ${stake.stakeId} | Amount: ${stake.amount} | Status: ${stake.status} | Created: ${stake.createdAt}`);

            // Check if there's an instant cashback reward for this stake
            const cashback = await prisma.pendingReward.findFirst({
                where: {
                    walletAddress: stake.user.walletAddress,
                    type: 'INSTANT_CASHBACK',
                    sourceId: stake.stakeId
                }
            });

            if (cashback) {
                console.log(`  ✅ Has cashback: ${cashback.amount} NILA (Status: ${cashback.status}, SourceId: ${cashback.sourceId})`);
            } else {
                // Check if there's a cashback without sourceId around the same time
                const anyCashback = await prisma.pendingReward.findFirst({
                    where: {
                        walletAddress: stake.user.walletAddress,
                        type: 'INSTANT_CASHBACK'
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                });

                if (anyCashback) {
                    console.log(`  ❌ No linked cashback, but found: ${anyCashback.amount} NILA (SourceId: ${anyCashback.sourceId})`);
                } else {
                    console.log(`  ⚠️  No cashback reward found`);
                }
            }
            console.log('');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkStakeRewardLink();
