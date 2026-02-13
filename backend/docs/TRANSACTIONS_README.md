# Transaction System - Quick Start Guide

## What's New?

A comprehensive transaction tracking system has been added to monitor all blockchain operations in the Nila Admin platform.

## Quick Setup

### 1. Run Database Migration

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
```

When prompted for migration name, use: `add_transactions_table`

### 2. Restart Backend

```bash
npm run dev
```

### 3. Access Frontend

The Transactions tab is now available in the admin dashboard sidebar.

## Features

### Backend
- ✅ Transaction model in Prisma schema
- ✅ Transaction service with full CRUD operations
- ✅ RESTful API endpoints with authentication
- ✅ Transaction statistics and analytics
- ✅ Filtering by type, status, wallet, and date range
- ✅ Pagination support

### Frontend
- ✅ Transactions component with data table
- ✅ Real-time statistics dashboard
- ✅ Advanced filtering (type, status, wallet)
- ✅ Search by wallet address
- ✅ Pagination controls
- ✅ Direct links to BSCScan
- ✅ Status indicators with icons
- ✅ Responsive design

## API Endpoints

All endpoints require admin authentication (Bearer token).

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | Get all transactions with filters |
| GET | `/api/transactions/hash/:txHash` | Get transaction by hash |
| GET | `/api/transactions/wallet/:address` | Get wallet transactions |
| GET | `/api/transactions/stats` | Get transaction statistics |
| GET | `/api/transactions/recent` | Get recent transactions |
| POST | `/api/transactions` | Create transaction record |
| PATCH | `/api/transactions/:txHash` | Update transaction status |

## Transaction Types

- `STAKE` - User staking tokens
- `UNSTAKE` - User unstaking tokens  
- `CLAIM_REWARD` - Reward claims
- `DEPOSIT` - Treasury deposits
- `WITHDRAW` - Treasury withdrawals
- `REFERRAL_REWARD` - Referral rewards
- `CONFIG_UPDATE` - Configuration updates

## Example Usage

### Create Transaction
```typescript
POST /api/transactions
{
  "txHash": "0x123abc...",
  "walletAddress": "0xdef456...",
  "type": "STAKE",
  "amount": 1000,
  "sourceId": "stake-uuid",
  "metadata": {
    "planName": "Gold",
    "lockDays": 30
  }
}
```

### Get Filtered Transactions
```typescript
GET /api/transactions?type=STAKE&status=confirmed&page=1&limit=20
```

### Get Statistics
```typescript
GET /api/transactions/stats?startDate=2024-01-01&endDate=2024-12-31
```

## Integration Points

### Existing Services
You can integrate transaction tracking into existing services:

```typescript
// In stake.service.ts
import { TransactionService } from './transaction.service';

// After creating a stake
await TransactionService.createTransaction({
  txHash: result.txHash,
  walletAddress: stake.walletAddress,
  type: 'STAKE',
  amount: stake.amount,
  sourceId: stake.stakeId
});
```

## Files Created

### Backend
- `backend/prisma/schema.prisma` (updated)
- `backend/src/services/transaction.service.ts`
- `backend/src/routes/transaction.routes.ts`
- `backend/src/server.ts` (updated)

### Frontend
- `admin-frontend/src/api/transactionApi.ts`
- `admin-frontend/src/components/Transactions.tsx`
- `admin-frontend/src/components/index.ts` (updated)
- `admin-frontend/src/components/AdminSidebar.tsx` (updated)
- `admin-frontend/src/pages/AdminDashboard.tsx` (updated)

## Testing

### Test API Endpoints
```bash
# Get transactions
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/transactions

# Get stats
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/transactions/stats
```

### Test Frontend
1. Login to admin dashboard
2. Click "Transactions" in sidebar
3. View transaction list and statistics
4. Test filters and search
5. Test pagination

## Next Steps

1. **Integrate with existing services** - Add transaction tracking to stake, reward, and treasury operations
2. **Set up monitoring** - Monitor pending transactions and update their status
3. **Add cleanup job** - Schedule periodic cleanup of old transactions
4. **Enhance analytics** - Add more detailed transaction analytics

## Support

For issues or questions:
1. Check the migration guide: `backend/docs/TRANSACTION_MIGRATION.md`
2. Review the Prisma schema: `backend/prisma/schema.prisma`
3. Check service implementation: `backend/src/services/transaction.service.ts`
