# Testing the User Flagging System

## ✅ What Was Fixed

The frontend now properly handles flagged users:
- Shows a red toast notification with the flag reason
- Automatically disconnects the flagged wallet
- Prevents access to all staking features

## 🧪 How to Test

### Step 1: Flag a User (Admin Panel)

1. Open the admin panel and login
2. Go to the **Users** page
3. Find a test user or use your own wallet
4. Click the **Flag** button
5. Enter a reason like "Testing flagging system"
6. Click **Confirm Flag**

✅ User should now show a red "Flagged" badge

### Step 2: Test Wallet Connection (Frontend)

1. Open the staking platform frontend
2. Try to connect with the flagged wallet
3. **Expected behavior:**
   - Wallet connects briefly
   - Red toast notification appears with message: "Your account has been flagged. Please contact support."
   - Wallet automatically disconnects
   - User cannot access any features

### Step 3: Unflag the User (Admin Panel)

1. Go back to admin panel
2. Find the flagged user
3. Click **Unflag** button
4. Confirm the action

✅ User should now show a green "Active" badge

### Step 4: Verify Normal Connection (Frontend)

1. Try connecting with the same wallet again
2. **Expected behavior:**
   - Wallet connects successfully
   - No error messages
   - User can access all features normally

## 🎬 Visual Indicators

### Frontend (User Experience)
- **Toast Notification**: Red background with error message
- **Auto-disconnect**: Wallet disconnects immediately
- **Duration**: Toast shows for 6 seconds

### Admin Panel
- **Active User**: 
  - Green badge with "Active" text
  - Green "Flag" button available
  
- **Flagged User**: 
  - Red badge with "Flagged" text and ⚠️ icon
  - Green "Unflag" button available

## 🔍 Backend Logs

When a flagged user tries to connect, you'll see in backend logs:
```
❌ Connect wallet error: Error: Your account has been flagged. Please contact support.
```

This is expected and shows the system is working correctly!

## 📝 Test Scenarios

### Scenario 1: Flag During Active Session
1. User is connected and using the platform
2. Admin flags the user
3. User tries to perform any action
4. ✅ Should work until they disconnect/reconnect

### Scenario 2: Flag Before Connection
1. Admin flags a user
2. User tries to connect wallet
3. ✅ Connection should be rejected immediately

### Scenario 3: Unflag and Reconnect
1. Flagged user is blocked
2. Admin unflags the user
3. User tries to connect again
4. ✅ Should connect successfully

### Scenario 4: Custom Flag Reason
1. Admin flags user with reason "Suspicious activity detected"
2. User tries to connect
3. ✅ Toast should show: "Suspicious activity detected"

## 🐛 Troubleshooting

### Issue: Toast doesn't appear
**Check:**
- Browser console for errors
- Toaster component is rendered in App.tsx
- Frontend is connected to correct backend API

### Issue: Wallet doesn't disconnect
**Check:**
- Frontend code is updated (clear cache/hard refresh)
- Error is being thrown from backend
- useWallet hook is being used

### Issue: User can still connect
**Check:**
- Backend server was restarted after Prisma changes
- User is actually flagged in database (check admin panel)
- Frontend is calling the correct API endpoint

## 🎯 Success Criteria

✅ Flagged user sees error message
✅ Wallet automatically disconnects
✅ Error message includes flag reason
✅ Unflagged user can connect normally
✅ Admin can flag/unflag from admin panel
✅ Visual indicators work correctly

## 📊 Database Verification

To check flag status directly in database:

```javascript
// In MongoDB shell or Prisma Studio
db.users.find({ isFlagged: true })
```

Or use the unflag script:
```bash
cd backend
npx ts-node scripts/unflag-user.ts --list
```

## 🚀 Next Steps

After successful testing:
1. Document any custom flag reasons your team will use
2. Train admins on when to flag users
3. Set up support process for flagged users
4. Consider adding audit logging for compliance

---

**The flagging system is now fully functional!** 🎉
