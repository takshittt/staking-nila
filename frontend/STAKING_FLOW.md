# Staking Flow Documentation

## Overview
The StakeNila component allows users to stake NILA tokens with configurable amounts and lock durations fetched from the backend.

## Flow

### 1. Configuration Loading
- On component mount, fetches active amount configs and lock configs from backend
- Displays available staking packages and lock durations
- Auto-selects first available options

### 2. User Selection
- User selects a staking package (amount)
- User selects a lock duration
- Live calculation shows:
  - Instant cashback amount
  - APR rewards
  - Total estimated rewards
  - Maturity date

### 3. Staking Process

#### Step 0: Network Check
- Automatically checks if user is on BSC Testnet (Chain ID: 97)
- If on wrong network:
  - Shows yellow warning banner with "Switch Network" button
  - Clicking button prompts wallet to switch to BSC Testnet
  - If BSC Testnet not added to wallet, automatically adds it
- Staking button disabled until on correct network

#### Step 1: Connect Wallet
- If not connected, clicking "Buy & Stake NILA" opens wallet connection modal
- Uses WalletConnect/Web3Modal for connection

#### Step 2: Token Approval
- Checks if staking contract has allowance to spend user's NILA tokens
- If not approved:
  - Prompts user to approve tokens
  - Waits for approval transaction confirmation
  - Shows "Approving..." status

#### Step 3: Stake Transaction
- Calls staking contract's `stake(amountId, lockId)` function
- User confirms transaction in wallet
- Waits for transaction confirmation
- Shows "Staking..." status

#### Step 4: Record in Database
- After blockchain confirmation, records stake in backend database
- Creates stake record with:
  - Wallet address
  - Plan details
  - Amount and APR
  - Lock duration
  - Transaction hash

#### Step 5: Success
- Shows success message with transaction hash
- Resets selections for next stake

## Smart Contract Integration

### Contract Methods Used
```solidity
// ERC20 Token (NILA)
function approve(address spender, uint256 amount) external returns (bool)
function allowance(address owner, address spender) external view returns (uint256)
function balanceOf(address account) external view returns (uint256)

// Staking Contract
function stake(uint256 amountId, uint256 lockId) external
function stakeWithReferral(uint256 amountId, uint256 lockId, address referrer) external
```

### Contract Addresses
- Staking Contract: `VITE_STAKING_CONTRACT_ADDRESS`
- NILA Token: `VITE_NILA_TOKEN_ADDRESS`

## API Endpoints

### GET /api/staking/amount-configs
Returns all active amount configurations
```json
[
  {
    "id": 0,
    "amount": "5000000000000000000000", // wei
    "instantRewardBps": 500, // 5%
    "active": true
  }
]
```

### GET /api/staking/lock-configs
Returns all active lock configurations
```json
[
  {
    "id": 0,
    "lockDuration": 90, // days
    "apr": 500, // 5%
    "active": true
  }
]
```

### POST /api/stakes
Records stake in database
```json
{
  "walletAddress": "0x...",
  "planName": "NILA Staking",
  "planVersion": 1,
  "amount": 5000,
  "apy": 5,
  "lockDays": 90,
  "txHash": "0x..."
}
```

## Error Handling

### Network Issues
- **Wrong network**: Automatically detects and prompts user to switch to BSC Testnet
- **Network switch failed**: User cancelled or wallet doesn't support network switching
- **Chain not added**: Automatically adds BSC Testnet to wallet if not present

### Common Errors
- **No wallet detected**: User needs to install MetaMask or another Web3 wallet
- **User rejected transaction**: User cancelled in wallet
- **Insufficient funds**: Not enough NILA or BNB for gas
- **Invalid configuration**: Selected package/duration not found
- **Network mismatch**: User on wrong network (should be BSC Testnet)

### User Feedback
- Loading states during fetch/approval/staking
- Status messages for each step
- Error alerts with clear messages
- Success confirmation with transaction hash

## Environment Variables

Required in `frontend/.env`:
```env
VITE_API_URL=http://localhost:3001/api
VITE_STAKING_CONTRACT_ADDRESS=0x...
VITE_NILA_TOKEN_ADDRESS=0x...
VITE_WALLETCONNECT_PROJECT_ID=...
```

## Future Enhancements
- [ ] Referral system integration
- [ ] Token purchase flow (buy NILA before staking)
- [ ] Balance checking before staking
- [ ] Network switching prompt
- [ ] Transaction history
- [ ] Stake management (view active stakes, claim rewards)
