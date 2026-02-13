# Treasury Management API

## Overview

The Treasury Management API provides endpoints for monitoring and managing the NILA token treasury in the staking contract. It allows admins to:

- Monitor contract balance and health
- Track pending rewards across all users
- Deposit tokens to fund rewards
- Withdraw excess tokens (when contract is paused)
- Control contract pause state

## Authentication

All endpoints require admin authentication via JWT token in the `Authorization` header:

```
Authorization: Bearer <admin_token>
```

## Endpoints

### GET /api/treasury/stats

Get comprehensive treasury statistics including balance, pending rewards, and health status.

**Response:**
```json
{
  "contractBalance": "1500000000000000000000000",
  "totalStaked": "1000000000000000000000000",
  "availableRewards": "500000000000000000000000",
  "pendingRewards": "450000000000000000000000",
  "surplus": "50000000000000000000000",
  "coverageRatio": 1.11,
  "healthStatus": "low"
}
```

**Health Status:**
- `healthy`: Coverage ratio >= 1.2 (120%+)
- `low`: Coverage ratio between 1.0 and 1.2 (100-120%)
- `critical`: Coverage ratio < 1.0 (under 100%)

**Note:** All token amounts are in wei (18 decimals). Divide by 1e18 to get NILA tokens.

---

### GET /api/treasury/status

Get contract pause status.

**Response:**
```json
{
  "isPaused": false
}
```

---

### GET /api/treasury/user-rewards/:walletAddress

Get pending rewards for a specific user.

**Parameters:**
- `walletAddress` (path): Ethereum wallet address

**Response:**
```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42e1",
  "totalPendingRewards": "1500000000000000000000",
  "activeStakes": 3,
  "breakdown": [
    {
      "stakeId": 0,
      "amount": "10000000000000000000000",
      "pendingReward": "500000000000000000000",
      "apr": 1200
    }
  ]
}
```

---

### POST /api/treasury/deposit

Deposit NILA tokens to the contract to fund rewards.

**Request Body:**
```json
{
  "amount": 100000
}
```

**Response:**
```json
{
  "txHash": "0x123...",
  "blockNumber": 12345678,
  "amount": "100000"
}
```

**Requirements:**
- Admin wallet must have sufficient NILA balance
- Amount must be greater than 0

**Process:**
1. Transfers tokens from admin wallet to contract
2. Emits `RewardFunded` event on contract
3. Creates audit log entry

---

### POST /api/treasury/withdraw

Withdraw excess rewards from the contract.

**Request Body:**
```json
{
  "amount": 50000
}
```

**Response:**
```json
{
  "txHash": "0x456...",
  "blockNumber": 12345679,
  "amount": "50000"
}
```

**Requirements:**
- Contract MUST be paused
- Amount must not exceed available rewards
- Amount must be greater than 0

**Process:**
1. Verifies contract is paused
2. Calls `withdrawExcessRewards()` on contract
3. Creates audit log entry

---

### POST /api/treasury/pause

Pause the staking contract (required for withdrawals).

**Response:**
```json
{
  "txHash": "0x789...",
  "blockNumber": 12345680
}
```

**Effects:**
- Disables all staking operations
- Enables emergency unstake
- Allows reward withdrawals

---

### POST /api/treasury/unpause

Unpause the staking contract to resume normal operations.

**Response:**
```json
{
  "txHash": "0xabc...",
  "blockNumber": 12345681
}
```

**Effects:**
- Re-enables staking operations
- Disables emergency unstake
- Prevents reward withdrawals

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message description"
}
```

**Common Error Codes:**
- `400`: Bad request (validation error)
- `401`: Unauthorized (invalid/missing token)
- `500`: Internal server error

**Common Error Messages:**
- `"Amount must be greater than 0"`
- `"Insufficient admin balance"`
- `"Contract must be paused to withdraw rewards"`
- `"Amount exceeds available rewards"`
- `"Failed to get treasury stats: <reason>"`

---

## Caching

The API implements caching for expensive operations:

- **Pending Rewards Calculation**: Cached for 5 minutes
  - Calculating total pending rewards requires querying all active stakes
  - Cache is invalidated after deposits/withdrawals

---

## Audit Trail

All treasury operations are logged in the `audit_logs` table:

- `DEPOSIT_REWARDS`: Token deposit
- `WITHDRAW_REWARDS`: Token withdrawal
- `PAUSE_CONTRACT`: Contract paused
- `UNPAUSE_CONTRACT`: Contract unpaused

Each log includes:
- Admin ID
- Action type
- Transaction hash
- Timestamp

---

## Testing

Run the test script to verify treasury functions:

```bash
cd backend
npx ts-node scripts/testTreasury.ts
```

Optional: Set `TEST_WALLET_ADDRESS` in `.env` to test user rewards query.

---

## Frontend Integration

The frontend uses `treasuryApi` client from `admin-frontend/src/api/treasuryApi.ts`:

```typescript
import { treasuryApi } from '../api/treasuryApi';

// Get stats
const stats = await treasuryApi.getStats();

// Deposit tokens
await treasuryApi.deposit(100000);

// Withdraw tokens
await treasuryApi.withdraw(50000);
```

---

## Security Considerations

1. **Deposits**: Requires admin wallet to have NILA tokens
2. **Withdrawals**: Contract must be paused (enforced by smart contract)
3. **Authentication**: All endpoints require valid admin JWT
4. **Validation**: Amount validation and balance checks
5. **Audit**: All operations logged with transaction hash

---

## Performance Notes

- Treasury stats calculation is relatively fast (3 RPC calls)
- Pending rewards calculation can be slow with many users (cached)
- Consider running pending rewards calculation in background job for large deployments
- Rate limiting recommended to prevent RPC abuse
