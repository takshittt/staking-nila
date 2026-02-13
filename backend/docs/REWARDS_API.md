# Rewards API Documentation

## Overview

The Rewards API provides a claim-based reward system for NILA staking. Instead of automatic crediting, all rewards (instant cashback, APY rewards, and referral rewards) are tracked as pending rewards that users must manually claim.

## Reward Types

1. **INSTANT_CASHBACK**: Immediate rewards when staking (e.g., 5% of stake amount)
2. **APY_REWARD**: Accumulated staking rewards based on APY
3. **REFERRAL_REWARD**: Rewards from referring new users

## Authentication

User endpoints are public (no authentication required). Admin endpoints require JWT authentication.

## User Endpoints

### GET /api/rewards/pending/:walletAddress

Get all pending (unclaimed) rewards for a user.

**Parameters:**
- `walletAddress` (path): Ethereum wallet address

**Response:**
```json
{
  "success": true,
  "rewards": {
    "instantCashback": 500.50,
    "stakingRewards": 120.25,
    "referralRewards": 50.00,
    "totalClaimable": 670.75,
    "breakdown": [
      {
        "id": "uuid",
        "type": "INSTANT_CASHBACK",
        "amount": 500.50,
        "createdAt": "2024-03-10T10:00:00Z",
        "sourceId": "STK-001",
        "metadata": {
          "stakeAmount": 10000,
          "rewardPercent": 5
        }
      }
    ]
  }
}
```

---

### GET /api/rewards/history/:walletAddress

Get reward claim history for a user.

**Parameters:**
- `walletAddress` (path): Ethereum wallet address
- `limit` (query, optional): Number of records to return (default: 50)

**Response:**
```json
{
  "success": true,
  "history": [
    {
      "id": "uuid",
      "type": "INSTANT_CASHBACK",
      "amount": 500.50,
      "createdAt": "2024-03-10T10:00:00Z",
      "claimedAt": "2024-03-11T15:30:00Z",
      "txHash": "0x123...abc",
      "sourceId": "STK-001"
    }
  ]
}
```

---

### GET /api/rewards/lifetime/:walletAddress

Get lifetime earnings statistics for a user.

**Parameters:**
- `walletAddress` (path): Ethereum wallet address

**Response:**
```json
{
  "success": true,
  "earnings": {
    "totalClaimed": 2450.75,
    "totalPending": 670.75,
    "totalLifetime": 3121.50
  }
}
```

---

### POST /api/rewards/claim

Claim pending rewards.

**Request Body:**
```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42e1",
  "type": "ALL",
  "rewardIds": ["uuid1", "uuid2"]
}
```

**Parameters:**
- `walletAddress` (required): User's wallet address
- `type` (optional): "ALL", "INSTANT_CASHBACK", "APY_REWARD", or "REFERRAL_REWARD"
- `rewardIds` (optional): Specific reward IDs to claim

**Response:**
```json
{
  "success": true,
  "txHash": "0x123...abc",
  "amount": 670.75,
  "rewardsClaimed": 3
}
```

**Errors:**
- `400`: Invalid wallet address or parameters
- `500`: Claim failed (insufficient contract balance, transaction error)

---

### POST /api/rewards/sync-apy/:walletAddress

Sync APY rewards from blockchain to database.

**Parameters:**
- `walletAddress` (path): Ethereum wallet address

**Response:**
```json
{
  "success": true,
  "synced": true
}
```

**Note:** This endpoint queries the smart contract for pending APY rewards and creates/updates pending reward records in the database.

---

## Admin Endpoints

### GET /api/rewards/admin/all-pending

Get summary of all pending rewards across all users (admin only).

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "rewards": [
    {
      "type": "INSTANT_CASHBACK",
      "status": "pending",
      "totalAmount": 15000.50,
      "count": 45
    },
    {
      "type": "APY_REWARD",
      "status": "pending",
      "totalAmount": 8500.25,
      "count": 120
    },
    {
      "type": "REFERRAL_REWARD",
      "status": "pending",
      "totalAmount": 3200.00,
      "count": 32
    }
  ]
}
```

---

## Reward Flow

### 1. Instant Cashback Flow

```
User stakes → 
StakeService.createStake() → 
RewardService.createPendingReward(INSTANT_CASHBACK) → 
User sees reward in Rewards component → 
User clicks "Claim" → 
Tokens transferred from treasury → 
Reward marked as claimed
```

### 2. APY Reward Flow

```
User stakes → 
Rewards accumulate on-chain → 
User clicks "Sync APY" → 
RewardService.syncAPYRewards() → 
Queries blockchain for pending rewards → 
Creates/updates pending reward records → 
User clicks "Claim" → 
Tokens transferred from treasury → 
Reward marked as claimed
```

### 3. Referral Reward Flow

```
New user stakes with referral code → 
StakeService.createStake() → 
RewardService.createPendingReward(REFERRAL_REWARD) for referrer → 
RewardService.createPendingReward(REFERRAL_REWARD) for referred user (bonus) → 
Both users see rewards in Rewards component → 
Users click "Claim" → 
Tokens transferred from treasury → 
Rewards marked as claimed
```

---

## Database Schema

### PendingReward Table

```prisma
model PendingReward {
  id              String    @id @default(uuid())
  userId          String
  walletAddress   String
  type            String    // "INSTANT_CASHBACK", "APY_REWARD", "REFERRAL_REWARD"
  amount          Decimal   @db.Decimal(20, 8)
  status          String    @default("pending")  // "pending", "claimed", "failed"
  sourceId        String?   // stakeId or referralId
  metadata        Json?     // Additional data
  createdAt       DateTime  @default(now())
  claimedAt       DateTime?
  txHash          String?
  
  user            User      @relation(fields: [userId], references: [id])
  
  @@index([userId])
  @@index([walletAddress])
  @@index([status])
  @@index([type])
}
```

---

## Frontend Integration

### Example: Load Pending Rewards

```typescript
import { rewardApi } from '../services/rewardApi';

const loadRewards = async (walletAddress: string) => {
  const rewards = await rewardApi.getPendingRewards(walletAddress);
  console.log('Total claimable:', rewards.totalClaimable);
};
```

### Example: Claim All Rewards

```typescript
const claimAll = async (walletAddress: string) => {
  const result = await rewardApi.claimRewards(walletAddress, 'ALL');
  console.log('Claimed:', result.amount, 'NILA');
  console.log('Transaction:', result.txHash);
};
```

### Example: Sync APY Rewards

```typescript
const syncAPY = async (walletAddress: string) => {
  await rewardApi.syncAPYRewards(walletAddress);
  // Reload rewards after sync
  const rewards = await rewardApi.getPendingRewards(walletAddress);
};
```

---

## Important Notes

1. **Treasury Balance**: Ensure the treasury contract has sufficient NILA tokens to cover all pending rewards.

2. **APY Sync**: APY rewards must be manually synced from the blockchain. Consider implementing a cron job to sync periodically.

3. **Gas Fees**: Claiming rewards requires a blockchain transaction. Users pay gas fees.

4. **Batch Claiming**: Users can claim all rewards at once or by type to optimize gas costs.

5. **Failed Claims**: If a claim transaction fails, rewards are marked as "failed" and can be retried.

6. **Cooldown Period**: APY rewards may have a 30-day cooldown period enforced by the smart contract.

---

## Error Handling

Common errors and solutions:

- **"No rewards to claim"**: User has no pending rewards
- **"Insufficient contract balance"**: Treasury needs more NILA tokens
- **"Failed to claim rewards"**: Transaction failed (check gas, network, contract state)
- **"User not found"**: Wallet address not registered (should auto-create on first stake)

---

## Migration from Auto-Credit System

If migrating from an automatic credit system:

1. Deploy new database schema with `PendingReward` table
2. Update `StakeService.createStake()` to create pending rewards instead of immediate transfers
3. Update frontend to use new reward API endpoints
4. Consider creating pending rewards for existing unclaimed rewards
5. Test thoroughly on testnet before mainnet deployment
