# User Flagging System

## Overview
The user flagging system allows administrators to prevent specific users from connecting their wallets to the staking platform. When a user is flagged, they cannot access any staking features.

## Features

### Backend Implementation

#### Database Schema Changes
Added the following fields to the `User` model in Prisma:
- `isFlagged` (Boolean): Indicates if the user is flagged
- `flaggedAt` (DateTime): Timestamp when the user was flagged
- `flaggedReason` (String): Optional reason for flagging
- `flaggedBy` (String): Admin ID who flagged the user
- `unflaggedAt` (DateTime): Timestamp when the user was unflagged

#### API Endpoints

**Flag User** (Admin only)
```
POST /api/users/:walletAddress/flag
Authorization: Bearer <admin-token>
Body: { reason?: string }
```

**Unflag User** (Admin only)
```
POST /api/users/:walletAddress/unflag
Authorization: Bearer <admin-token>
```

**Validate Wallet** (Public)
```
POST /api/users/validate
Body: { walletAddress: string }
Response: { allowed: boolean, reason?: string, flaggedAt?: DateTime }
```

#### Service Methods
- `UserService.flagUser(walletAddress, reason?, flaggedBy?)`: Flag a user
- `UserService.unflagUser(walletAddress)`: Unflag a user
- `UserService.validateWalletConnection(walletAddress)`: Check if wallet is allowed to connect

#### Wallet Connection Protection
The `connectWallet` method now checks if a user is flagged before allowing connection. If flagged, it throws an error with the flag reason.

### Admin Frontend Implementation

#### Users Component
- Added "Flag" button for active users
- Added "Unflag" button for flagged users
- Flag modal with optional reason input
- Visual indicators for flagged users (red badge with AlertCircle icon)
- Confirmation dialog for unflagging

#### User Profile Modal
- Displays flag status prominently
- Shows flag/unflag action buttons
- Inline flag reason input
- Real-time status updates

#### API Integration
- `userApi.flagUser(walletAddress, reason?)`: Flag a user
- `userApi.unflagUser(walletAddress)`: Unflag a user

### Staking Platform Frontend Implementation

#### Wallet Connection Flow
- `useWallet` hook checks for flagged status on connection
- Automatically disconnects flagged wallets
- Shows alert with flag reason to the user
- Prevents access to all staking features

#### User API
- `userApi.validateWallet(walletAddress)`: Validate wallet before operations

## Usage

### For Administrators

1. **Flag a User**
   - Navigate to Users page in admin panel
   - Click "Flag" button next to the user
   - Optionally enter a reason
   - Confirm the action

2. **Unflag a User**
   - Navigate to Users page in admin panel
   - Click "Unflag" button next to the flagged user
   - Confirm the action

3. **View Flag Details**
   - Click "View" to open user profile modal
   - Flag status is displayed prominently
   - Flag/unflag actions available in modal

### For Users

When a flagged user attempts to connect their wallet:
1. Wallet connection is rejected
2. Error message is displayed with the flag reason
3. User is automatically disconnected
4. User must contact support to resolve the issue

## Security Considerations

- Only authenticated admin users can flag/unflag users
- Flag operations are logged with admin ID
- Wallet validation happens on both frontend and backend
- Flag status is checked on every wallet connection attempt
- Users cannot bypass flag restrictions

## Database Migration

To apply the schema changes:

```bash
cd backend
npx prisma generate
npx prisma db push
```

Note: For MongoDB, Prisma handles migrations automatically. The migration file serves as documentation.

## Testing

### Test Flag Functionality
1. Flag a test user from admin panel
2. Attempt to connect with that wallet address
3. Verify connection is rejected with appropriate message
4. Unflag the user
5. Verify connection works again

### Test API Endpoints
```bash
# Flag user (requires admin token)
curl -X POST http://localhost:3001/api/users/:walletAddress/flag \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Suspicious activity"}'

# Validate wallet
curl -X POST http://localhost:3001/api/users/validate \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "0x..."}'

# Unflag user (requires admin token)
curl -X POST http://localhost:3001/api/users/:walletAddress/unflag \
  -H "Authorization: Bearer <admin-token>"
```

## Future Enhancements

- Audit log for all flag/unflag operations
- Bulk flag/unflag operations
- Automatic flagging based on suspicious activity
- Email notifications to flagged users
- Appeal system for flagged users
- Temporary flags with auto-expiration
- Flag categories (fraud, abuse, violation, etc.)
