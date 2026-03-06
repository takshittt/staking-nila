/**
 * Unflag User Script
 * 
 * This script unflags a specific user or shows all flagged users
 * 
 * Usage: 
 *   npx ts-node scripts/unflag-user.ts <wallet-address>
 *   npx ts-node scripts/unflag-user.ts --list
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function unflagUser(walletAddress: string) {
  try {
    const normalizedAddress = walletAddress.toLowerCase();
    
    const user = await prisma.user.findUnique({
      where: { walletAddress: normalizedAddress }
    });

    if (!user) {
      console.log(`❌ User not found: ${walletAddress}`);
      return;
    }

    if (!user.isFlagged) {
      console.log(`ℹ️  User is not flagged: ${walletAddress}`);
      return;
    }

    console.log(`\n🔓 Unflagging user: ${walletAddress}`);
    console.log(`   Flagged at: ${user.flaggedAt}`);
    console.log(`   Reason: ${user.flaggedReason || 'No reason provided'}`);

    const updated = await prisma.user.update({
      where: { walletAddress: normalizedAddress },
      data: {
        isFlagged: false,
        unflaggedAt: new Date(),
        status: 'active'
      }
    });

    console.log(`\n✅ User unflagged successfully!`);
    console.log(`   Status: ${updated.status}`);
    console.log(`   Unflagged at: ${updated.unflaggedAt}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function listFlaggedUsers() {
  try {
    console.log('\n🔍 Searching for flagged users...\n');

    const flaggedUsers = await prisma.user.findMany({
      where: { isFlagged: true },
      select: {
        walletAddress: true,
        flaggedAt: true,
        flaggedReason: true,
        flaggedBy: true,
        status: true
      }
    });

    if (flaggedUsers.length === 0) {
      console.log('✅ No flagged users found.\n');
      return;
    }

    console.log(`Found ${flaggedUsers.length} flagged user(s):\n`);

    flaggedUsers.forEach((user, index) => {
      console.log(`${index + 1}. Wallet: ${user.walletAddress}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Flagged at: ${user.flaggedAt}`);
      console.log(`   Reason: ${user.flaggedReason || 'No reason provided'}`);
      console.log(`   Flagged by: ${user.flaggedBy || 'Unknown'}`);
      console.log('');
    });

    console.log('To unflag a user, run:');
    console.log('npx ts-node scripts/unflag-user.ts <wallet-address>\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('\n❌ Error: Missing argument\n');
  console.log('Usage:');
  console.log('  npx ts-node scripts/unflag-user.ts <wallet-address>');
  console.log('  npx ts-node scripts/unflag-user.ts --list\n');
  process.exit(1);
}

if (args[0] === '--list' || args[0] === '-l') {
  listFlaggedUsers();
} else {
  unflagUser(args[0]);
}
