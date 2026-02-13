# Transaction System Migration Guide

## Overview
This document describes the new Transaction tracking system added to the Nila Admin platform.

## Database Changes

### New Table: `transactions`
A new table has been added to track all blockchain transactions in the system.

```sql
CREATE TABLE `transactions` (
  `id` VARCHAR(191) NOT NULL,
  `txHash` VARCHAR(191) NOT NULL,
  `walletAddress` VARCHAR(191) NULL,
  `type` VARCHAR(191) NOT NULL,
  `amount` DECIMAL(20, 8) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
  `blockNumber` INTEGER NULL,
  `gasUsed` VARCHAR(191) NULL,
  `gasPrice` VARCHAR(191) NULL,
  `sourceId` VARCHAR(191) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `confirmedAt` DATETIME(3) NULL,
  
  PRIMARY KEY (`id`),
  UNIQUE INDEX `transactions_txHash_key`(`txHash`),
  INDEX `transactions_txHash_idx`(`txHash`),
  INDEX `transactions_walletAddress_idx`(`walletAddress`),
  INDEX `transactions_type_idx`(`type`),
  INDEX `transactions_status_idx`(`status`),
  INDEX `transactions_createdAt_idx`(`createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Transaction Types
- `STAKE` - User staking tokens
- `UNSTAKE` - User unstaking tokens
- `CLAIM_REWARD` - User claiming rewards
- `DEPOSIT` - Admin depositing to treasury
- `WITHDRAW` - Admin withdrawing from treasury
- `REFERRAL_REWARD` - Referral reward distribution
- `CONFIG_UPDATE` - Staking configuration updates

### Transaction Status
- `pending` - Transaction submitted but not confirmed
- `confirmed` - Transaction confirmed on blockchain
- `failed` - Transaction failed

## Migration Steps

1. **Update Prisma Schema**
   ```bash
   cd backend
   npm run prisma:generate
   npm run prisma:migrate
   ```

2. **Verify Migration**
   ```bash
   npm run prisma:studio
   ```
   Check that the `transactions` table exists.

3. **Restart Backend Server**
   ```bash
   npm run dev
   ```

## API Endpoints

### GET /api/transactions
Get all transactions with optional filters
- Query params: `type`, `status`, `walletAddress`, `startDate`, `endDate`, `page`, `limit`
- Requires: Admin authentication

### GET /api/transactions/hash/:txHash
Get specific transaction by hash
- Requires: Admin authentication

### GET /api/transactions/wallet/:walletAddress
Get transactions for a specific wallet
- Query params: `page`, `limit`
- Requires: Admin authentication

### GET /api/transactions/stats
Get transaction statistics
- Query params: `startDate`, `endDate`
- Requires: Admin authentication

### GET /api/transactions/recent
Get recent transactions
- Query params: `limit` (default: 10)
- Requires: Admin authentication

### POST /api/transactions
Create a new transaction record
- Body: `{ txHash, walletAddress?, type, amount?, sourceId?, metadata? }`
- Requires: Admin authentication

### PATCH /api/transactions/:txHash
Update transaction status
- Body: `{ status?, blockNumber?, gasUsed?, gasPrice? }`
- Requires: Admin authentication

## Frontend Integration

### New Component: Transactions
Located at: `admin-frontend/src/components/Transactions.tsx`

Features:
- View all transactions with filtering
- Search by wallet address
- Filter by type and status
- Pagination support
- Transaction statistics dashboard
- Direct links to BSCScan

### Navigation
The Transactions tab has been added to the admin sidebar with a Receipt icon.

## Usage Examples

### Track a Stake Transaction
```typescript
import { TransactionService } from './services/transaction.service';

// When user stakes
const transaction = await TransactionService.createTransaction({
  txHash: '0x123...',
  walletAddress: '0xabc...',
  type: 'STAKE',
  amount: 1000,
  sourceId: stakeId,
  metadata: { planName: 'Gold', lockDays: 30 }
});

// Update when confirmed
await TransactionService.updateTransaction(txHash, {
  status: 'confirmed',
  blockNumber: 12345678,
  gasUsed: '21000',
  gasPrice: '5000000000'
});
```

### Get Transaction Statistics
```typescript
const stats = await TransactionService.getTransactionStats();
console.log(stats);
// {
//   total: 1250,
//   confirmed: 1200,
//   pending: 45,
//   failed: 5,
//   byType: { STAKE: 800, CLAIM_REWARD: 300, ... },
//   totalVolume: 1500000
// }
```

## Best Practices

1. **Always create transaction records** when initiating blockchain operations
2. **Update transaction status** after blockchain confirmation
3. **Include metadata** for better tracking and debugging
4. **Use sourceId** to link transactions to stakes, rewards, etc.
5. **Monitor pending transactions** and update their status regularly

## Maintenance

### Cleanup Old Transactions
```typescript
// Delete transactions older than 90 days
await TransactionService.deleteOldTransactions(90);
```

### Monitor Failed Transactions
Regularly check for failed transactions and investigate:
```typescript
const failed = await TransactionService.getTransactions({ status: 'failed' });
```

## Troubleshooting

### Transaction not showing up
- Check if transaction was created in database
- Verify filters are not excluding the transaction
- Check pagination settings

### Status not updating
- Ensure blockchain service is properly configured
- Check transaction hash is correct
- Verify update endpoint is being called

### Performance issues
- Add indexes if querying large datasets
- Implement cleanup for old transactions
- Consider archiving historical data
