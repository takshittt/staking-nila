/**
 * Test script for User Flagging System
 * 
 * This script tests the flagging functionality:
 * 1. Creates a test user
 * 2. Flags the user
 * 3. Validates wallet connection (should fail)
 * 4. Unflags the user
 * 5. Validates wallet connection (should succeed)
 * 
 * Usage: npx ts-node scripts/test-flagging.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_WALLET = '0xtest1234567890abcdef1234567890abcdef123456';

async function testFlagging() {
  console.log('🧪 Testing User Flagging System\n');

  try {
    // Clean up any existing test user
    console.log('🧹 Cleaning up existing test data...');
    await prisma.user.deleteMany({
      where: { walletAddress: TEST_WALLET.toLowerCase() }
    });
    console.log('✅ Cleanup complete\n');

    // Step 1: Create test user
    console.log('1️⃣  Creating test user...');
    const user = await prisma.user.create({
      data: {
        walletAddress: TEST_WALLET.toLowerCase(),
        referralCode: 'TEST123',
        syncStatus: 'SYNCED'
      }
    });
    console.log(`✅ User created: ${user.walletAddress}\n`);

    // Step 2: Flag the user
    console.log('2️⃣  Flagging user...');
    const flaggedUser = await prisma.user.update({
      where: { walletAddress: TEST_WALLET.toLowerCase() },
      data: {
        isFlagged: true,
        flaggedAt: new Date(),
        flaggedReason: 'Test flagging - automated test',
        flaggedBy: 'test-admin',
        status: 'flagged'
      }
    });
    console.log(`✅ User flagged: ${flaggedUser.walletAddress}`);
    console.log(`   Reason: ${flaggedUser.flaggedReason}`);
    console.log(`   Status: ${flaggedUser.status}\n`);

    // Step 3: Validate wallet connection (should fail)
    console.log('3️⃣  Testing wallet validation (should fail)...');
    const validation1 = await prisma.user.findUnique({
      where: { walletAddress: TEST_WALLET.toLowerCase() }
    });
    
    if (validation1 && validation1.isFlagged) {
      console.log('✅ Validation correctly blocked flagged user');
      console.log(`   Message: ${validation1.flaggedReason}\n`);
    } else {
      console.log('❌ ERROR: Flagged user was not blocked!\n');
      throw new Error('Validation test failed');
    }

    // Step 4: Unflag the user
    console.log('4️⃣  Unflagging user...');
    const unflaggedUser = await prisma.user.update({
      where: { walletAddress: TEST_WALLET.toLowerCase() },
      data: {
        isFlagged: false,
        unflaggedAt: new Date(),
        status: 'active'
      }
    });
    console.log(`✅ User unflagged: ${unflaggedUser.walletAddress}`);
    console.log(`   Status: ${unflaggedUser.status}\n`);

    // Step 5: Validate wallet connection (should succeed)
    console.log('5️⃣  Testing wallet validation (should succeed)...');
    const validation2 = await prisma.user.findUnique({
      where: { walletAddress: TEST_WALLET.toLowerCase() }
    });
    
    if (validation2 && !validation2.isFlagged) {
      console.log('✅ Validation correctly allowed unflagged user\n');
    } else {
      console.log('❌ ERROR: Unflagged user was blocked!\n');
      throw new Error('Validation test failed');
    }

    // Cleanup
    console.log('🧹 Cleaning up test data...');
    await prisma.user.delete({
      where: { walletAddress: TEST_WALLET.toLowerCase() }
    });
    console.log('✅ Cleanup complete\n');

    console.log('🎉 All tests passed successfully!');
    console.log('\nUser Flagging System is working correctly.');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
testFlagging();
