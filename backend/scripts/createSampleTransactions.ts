/**
 * Create sample transactions for testing
 * Run with: tsx scripts/createSampleTransactions.ts <wallet_address>
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createSampleTransactions() {
  const walletAddress = process.argv[2];

  if (!walletAddress) {
    console.error('❌ Please provide a wallet address');
    console.log('Usage: tsx scripts/createSampleTransactions.ts 0xYourWalletAddress');
    process.exit(1);
  }

  console.log(`🔨 Creating sample transactions for wallet: ${walletAddress}\n`);

  try {
    // Create user if doesn't exist
    const user = await prisma.user.upsert({
      where: { walletAddress },
      update: {},
      create: {
        walletAddress,
        status: 'active'
      }
    });

    console.log('✅ User ensured:', user.id);

    // Sample transactions
    const sampleTransactions = [
      {
        txHash: '0x' + Math.random().toString(16).substring(2, 66),
        walletAddress,
        type: 'STAKE',
        amount: 10000,
        status: 'confirmed',
        blockNumber: 12345678,
        metadata: { planName: 'Gold', lockDays: 30 }
      },
      {
        txHash: '0x' + Math.random().toString(16).substring(2, 66),
        walletAddress,
        type: 'CLAIM_REWARD',
        amount: 450,
        status: 'confirmed',
        blockNumber: 12345680,
        metadata: { rewardType: 'APY_REWARD' }
      },
      {
        txHash: '0x' + Math.random().toString(16).substring(2, 66),
        walletAddress,
        type: 'REFERRAL_REWARD',
        amount: 120,
        status: 'confirmed',
        blockNumber: 12345682,
        metadata: { referredWallet: '0x123...' }
      },
      {
        txHash: '0x' + Math.random().toString(16).substring(2, 66),
        walletAddress,
        type: 'STAKE',
        amount: 5000,
        status: 'pending',
        metadata: { planName: 'Silver', lockDays: 15 }
      },
      {
        txHash: '0x' + Math.random().toString(16).substring(2, 66),
        walletAddress,
        type: 'CLAIM_REWARD',
        amount: 200,
        status: 'confirmed',
        blockNumber: 12345685,
        metadata: { rewardType: 'INSTANT_CASHBACK' }
      }
    ];

    // Create transactions
    for (const tx of sampleTransactions) {
      const created = await prisma.transaction.create({
        data: {
          ...tx,
          confirmedAt: tx.status === 'confirmed' ? new Date() : undefined
        }
      });
      console.log(`✅ Created ${tx.type} transaction: ${created.id}`);
    }

    console.log('\n🎉 Successfully created sample transactions!');
    console.log(`\n📝 Summary:`);
    console.log(`   Wallet: ${walletAddress}`);
    console.log(`   Transactions created: ${sampleTransactions.length}`);
    console.log(`\n💡 Now open your frontend and navigate to the Transactions tab to see them!`);

  } catch (error: any) {
    console.error('❌ Error creating sample transactions:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createSampleTransactions();
