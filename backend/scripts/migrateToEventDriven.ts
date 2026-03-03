/**
 * One-time migration script for existing users
 * Run this ONCE to sync current blockchain state for users who registered before event-driven sync
 * 
 * Usage: npx tsx scripts/migrateToEventDriven.ts
 */

import { PrismaClient } from '@prisma/client';
import { BlockchainQueryService } from '../src/services/blockchainQuery.service';
import { BlockchainService } from '../src/services/blockchain.service';

const prisma = new PrismaClient();

async function migrateUser(walletAddress: string) {
  console.log(`\n[Migrate] Processing ${walletAddress}...`);
  
  try {
    // Sync current state from blockchain
    await BlockchainQueryService.syncCurrentState(walletAddress);
    
    // Update user sync status
    await prisma.user.update({
      where: { walletAddress: walletAddress.toLowerCase() },
      data: { 
        syncStatus: 'SYNCED',
        lastSyncedAt: new Date()
      }
    });
    
    console.log(`✅ [Migrate] Completed for ${walletAddress}`);
  } catch (error: any) {
    console.error(`❌ [Migrate] Failed for ${walletAddress}:`, error.message);
  }
}

async function main() {
  console.log('Starting migration to event-driven sync...\n');
  
  // Initialize blockchain service
  BlockchainService.initialize();
  
  // Get all users
  const users = await prisma.user.findMany({
    select: { walletAddress: true }
  });
  
  console.log(`Found ${users.length} users to migrate\n`);
  
  // Process users one by one with delay to avoid rate limits
  for (const user of users) {
    await migrateUser(user.walletAddress);
    
    // Wait 2 seconds between users to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n✅ Migration completed!');
  console.log('Event-driven sync is now active for all users.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
