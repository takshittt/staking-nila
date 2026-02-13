import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testUserTracking() {
  console.log('🧪 Testing User Tracking System...\n');

  try {
    // 1. Create test user
    console.log('1. Creating test user...');
    const user = await prisma.user.create({
      data: {
        walletAddress: '0xtest123456789',
        referralCode: 'TEST123',
        status: 'active'
      }
    });
    console.log('✅ User created:', user.walletAddress);

    // 2. Create test stake
    console.log('\n2. Creating test stake...');
    const stake = await prisma.stake.create({
      data: {
        stakeId: 'STK-TEST-001',
        userId: user.id,
        planName: 'Test Plan',
        planVersion: 1,
        amount: 1000,
        apy: 5,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'active'
      }
    });
    console.log('✅ Stake created:', stake.stakeId);

    // 3. Create referral config
    console.log('\n3. Creating referral config...');
    const config = await prisma.referralConfig.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        referralPercentage: 5.0,
        referrerPercentage: 2.0,
        isPaused: false
      },
      update: {}
    });
    console.log('✅ Referral config created:', config);

    // 4. Query data
    console.log('\n4. Querying user with stakes...');
    const userWithStakes = await prisma.user.findUnique({
      where: { id: user.id },
      include: { stakes: true }
    });
    console.log('✅ User with stakes:', {
      wallet: userWithStakes?.walletAddress,
      stakesCount: userWithStakes?.stakes.length
    });

    // 5. Cleanup
    console.log('\n5. Cleaning up test data...');
    await prisma.stake.delete({ where: { id: stake.id } });
    await prisma.user.delete({ where: { id: user.id } });
    console.log('✅ Test data cleaned up');

    console.log('\n✨ All tests passed! User tracking system is working correctly.\n');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testUserTracking();
