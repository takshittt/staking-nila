# Quick Start Guide - User Flagging System

## 🚀 Setup (5 minutes)

### Step 1: Apply Database Changes
```bash
cd backend
npx prisma generate
npx prisma db push
```

### Step 2: Restart Backend
```bash
# Stop your backend server (Ctrl+C)
npm run dev
```

### Step 3: Done!
The flagging system is now active. No frontend rebuild needed.

## 📖 How to Use

### Flag a User (Admin Panel)

1. Go to **Users** page
2. Find the user you want to flag
3. Click **Flag** button
4. (Optional) Enter a reason
5. Click **Confirm Flag**

✅ User is now blocked from connecting their wallet

### Unflag a User (Admin Panel)

1. Go to **Users** page
2. Find the flagged user (red badge)
3. Click **Unflag** button
4. Confirm the action

✅ User can now connect their wallet again

## 🧪 Quick Test

### Test with cURL
```bash
# Replace with your admin token and wallet address
ADMIN_TOKEN="your-token-here"
WALLET="0x1234567890abcdef1234567890abcdef12345678"

# Flag user
curl -X POST http://localhost:3001/api/users/$WALLET/flag \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Testing"}'

# Check if blocked
curl -X POST http://localhost:3001/api/users/validate \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\": \"$WALLET\"}"

# Unflag user
curl -X POST http://localhost:3001/api/users/$WALLET/unflag \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Test with Script
```bash
cd backend
npx ts-node scripts/test-flagging.ts
```

## 🎯 What Happens When a User is Flagged?

1. **Existing Connection**: User is immediately disconnected
2. **New Connection**: Connection attempt is rejected
3. **Error Message**: User sees the flag reason
4. **All Features**: User cannot access any staking features

## 🔍 Visual Indicators

### In Users Table
- **Active User**: Green badge "Active"
- **Flagged User**: Red badge "Flagged" with ⚠️ icon

### In User Profile Modal
- **Status Section**: Shows current flag status
- **Action Buttons**: 
  - Active user → Red "Flag User" button
  - Flagged user → Green "Unflag User" button

## 📋 API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/users/:wallet/flag` | POST | Admin | Flag a user |
| `/api/users/:wallet/unflag` | POST | Admin | Unflag a user |
| `/api/users/validate` | POST | Public | Check if wallet is allowed |

## ⚠️ Important Notes

1. **Flagging is immediate** - Takes effect instantly
2. **Reason is optional** - But recommended for documentation
3. **Admin only** - Only authenticated admins can flag/unflag
4. **Permanent until unflagged** - No auto-expiration
5. **Affects all features** - User cannot access anything while flagged

## 🆘 Troubleshooting

**Problem**: Flag button doesn't work
- **Solution**: Check admin authentication token

**Problem**: User can still connect after flagging
- **Solution**: Restart backend server

**Problem**: Database error when flagging
- **Solution**: Run `npx prisma generate` and `npx prisma db push`

## 📚 More Information

- Full documentation: `USER_FLAGGING_SYSTEM.md`
- Implementation details: `IMPLEMENTATION_SUMMARY.md`
- Test script: `backend/scripts/test-flagging.ts`

## ✅ Checklist

- [ ] Database schema updated
- [ ] Backend server restarted
- [ ] Tested flagging a user
- [ ] Tested unflagging a user
- [ ] Verified wallet connection blocking
- [ ] Checked error messages display correctly

---

**That's it!** The user flagging system is ready to use. 🎉
