/**
 * Test script for Transaction System
 * 
 * Run with: tsx scripts/testTransactions.ts
 */

import { TransactionService } from '../src/services/transaction.service';
import { TransactionTracker } from '../src/services/transaction-tracker.helper';

async function testTransactionSystem() {
  console.log('🧪 Testing Transaction System...\n');

  try {
    // Test 1: Create a stake transaction
    console.log('1️⃣ Creating stake transaction...');
    const stakeTransaction = await TransactionTracker.trackStake(
      '0x' + Math.random().toString(16).substring(2, 66),
      '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      1000
    );
    console.log('✅ Stake transaction created:', stakeTransaction.id);

    // Test 2: Create a reward claim transaction
    console.log('\n2️⃣ Creating reward claim transaction...');
    const rewardTransaction = await TransactionTracker.trackRewardClaim(
      '0x' + Math.random().toString(16).substring(2, 66),
      '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      50
    );
    console.log('✅ Reward transaction created:', rewardTransaction.id);

    // Test 3: Update transaction status
    console.log('\n3️⃣ Confirming stake transaction...');
    const confirmed = await TransactionTracker.confirmTransaction(
      stakeTransaction.txHash
    );
    console.log('✅ Transaction confirmed:', confirmed.status);

    // Test 4: Get all transactions
    console.log('\n4️⃣ Fetching all transactions...');
    const allTransactions = await TransactionService.getTransactions({}, 1, 10);
    console.log(`✅ Found ${allTransactions.transactions.length} transactions`);
    console.log(`   Total: ${allTransactions.pagination.total}`);

    // Test 5: Get transaction statistics
    console.log('\n5️⃣ Getting transaction statistics...');
    const stats = await TransactionService.getTransactionStats();
    console.log('✅ Statistics:');
    console.log(`   Total: ${stats.total}`);
    console.log(`   Confirmed: ${stats.confirmed}`);
    console.log(`   Pending: ${stats.pending}`);
    console.log(`   Failed: ${stats.failed}`);
    console.log(`   Total Volume: ${stats.totalVolume}`);
    console.log('   By Type:', stats.byType);

    // Test 6: Get transaction by hash
    console.log('\n6️⃣ Getting transaction by hash...');
    const txByHash = await TransactionService.getTransactionByHash(stakeTransaction.txHash);
    console.log('✅ Transaction found:', txByHash?.id);

    // Test 7: Get recent transactions
    console.log('\n7️⃣ Getting recent transactions...');
    const recent = await TransactionService.getRecentTransactions(5);
    console.log(`✅ Found ${recent.length} recent transactions`);

    // Test 8: Filter transactions by type
    console.log('\n8️⃣ Filtering transactions by type (STAKE)...');
    const stakeTransactions = await TransactionService.getTransactions({ type: 'STAKE' }, 1, 10);
    console.log(`✅ Found ${stakeTransactions.transactions.length} stake transactions`);

    // Test 9: Filter transactions by status
    console.log('\n9️⃣ Filtering transactions by status (confirmed)...');
    const confirmedTransactions = await TransactionService.getTransactions({ status: 'confirmed' }, 1, 10);
    console.log(`✅ Found ${confirmedTransactions.transactions.length} confirmed transactions`);

    // Test 10: Batch create transactions
    console.log('\n🔟 Batch creating transactions...');
    const batchResult = await TransactionTracker.trackBatch([
      {
        txHash: '0x' + Math.random().toString(16).substring(2, 66),
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        type: 'STAKE',
        amount: 500
      },
      {
        txHash: '0x' + Math.random().toString(16).substring(2, 66),
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        type: 'CLAIM_REWARD',
        amount: 25
      }
    ]);
    console.log(`✅ Batch created: ${batchResult.successful} successful, ${batchResult.failed} failed`);

    console.log('\n✨ All tests passed successfully!\n');

    // Display summary
    console.log('📊 Final Summary:');
    const finalStats = await TransactionService.getTransactionStats();
    console.log(`   Total Transactions: ${finalStats.total}`);
    console.log(`   Confirmed: ${finalStats.confirmed}`);
    console.log(`   Pending: ${finalStats.pending}`);
    console.log(`   Failed: ${finalStats.failed}`);
    console.log(`   Total Volume: ${finalStats.totalVolume} NILA`);

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
}

// Run tests
testTransactionSystem();
