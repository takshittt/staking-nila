import { BlockchainService } from '../src/services/blockchain.service';
import dotenv from 'dotenv';

dotenv.config();

async function testTreasury() {
  try {
    console.log('🔍 Testing Treasury Functions...\n');

    // Initialize blockchain service
    BlockchainService.initialize();
    console.log('✅ Blockchain service initialized\n');

    // Test 1: Get treasury stats
    console.log('📊 Test 1: Get Treasury Stats');
    const stats = await BlockchainService.getTreasuryStats();
    console.log('Contract Balance:', (Number(stats.contractBalance) / 1e18).toFixed(2), 'NILA');
    console.log('Total Staked:', (Number(stats.totalStaked) / 1e18).toFixed(2), 'NILA');
    console.log('Available Rewards:', (Number(stats.availableRewards) / 1e18).toFixed(2), 'NILA');
    console.log('✅ Treasury stats retrieved\n');

    // Test 2: Check contract pause status
    console.log('🔒 Test 2: Check Contract Status');
    const isPaused = await BlockchainService.isContractPaused();
    console.log('Contract Paused:', isPaused);
    console.log('✅ Contract status checked\n');

    // Test 3: Get user pending rewards (if wallet address provided)
    if (process.env.TEST_WALLET_ADDRESS) {
      console.log('💰 Test 3: Get User Pending Rewards');
      const userRewards = await BlockchainService.getUserPendingRewards(
        process.env.TEST_WALLET_ADDRESS
      );
      console.log('Wallet:', process.env.TEST_WALLET_ADDRESS);
      console.log('Total Pending:', (Number(userRewards.totalPendingRewards) / 1e18).toFixed(2), 'NILA');
      console.log('Active Stakes:', userRewards.activeStakes);
      console.log('✅ User rewards retrieved\n');
    } else {
      console.log('⏭️  Test 3: Skipped (no TEST_WALLET_ADDRESS in .env)\n');
    }

    console.log('✅ All tests completed successfully!');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testTreasury();
