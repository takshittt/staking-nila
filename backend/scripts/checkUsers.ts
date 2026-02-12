import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  console.log('📊 Checking users in database...\n');

  try {
    const users = await prisma.user.findMany({
      orderBy: { firstConnectedAt: 'desc' },
      take: 10
    });

    console.log(`Found ${users.length} users:\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.walletAddress}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Referral Code: ${user.referralCode}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Connected: ${user.firstConnectedAt.toISOString()}`);
      console.log('');
    });

    if (users.length === 0) {
      console.log('⚠️  No users found in database');
      console.log('   Try connecting a wallet in the frontend');
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
