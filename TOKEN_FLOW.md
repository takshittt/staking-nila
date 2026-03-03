# NILA Staking Token Flow Documentation

## Overview

This document describes the complete token flow when users purchase and stake NILA tokens through the Buy & Stake feature, utilizing the Nila-LatestFiles backend as a payment gateway and NILA token provider.

---

## Architecture Components

### 1. **Frontend (BuyStakeNila.tsx)**
- User interface for selecting payment options
- Supports multiple chains: BSC, Ethereum, TRON
- Supports multiple tokens: USDT, USDC, BNB, ETH, TRX

### 2. **Nila-LatestFiles Backend**
- Payment verification service
- NILA token treasury (holds NILA supply)
- Chainlink price oracle integration
- Multi-chain transaction verification

### 3. **Your Staking Contract**
- Stake management and record keeping
- Reward distribution (instant + APY + referral)
- NILA token custody for staking

---

## Complete User Journey & Token Flow

### **STEP 1: User Selects Payment Options**

**Frontend (BuyStakeNila.tsx):**
```
User selects:
├── Chain: BSC / ETH / TRON
├── Token: USDT / USDC / BNB / ETH / TRX
├── Amount: 100 USDT (or equivalent)
└── Lock Period: 30 days
```

**Frontend calls Nila-LatestFiles Backend:**
```javascript
POST http://nila-backend.com/create-order
Body: {
  wallet: "0xUserAddress",
  pyrandAmount: 1250,  // NILA amount (100 USDT / $0.08)
  network: "BSC_USDT"
}

Response: {
  orderId: "ORD_1234567890",
  network: "BSC_USDT",
  recipient: "0xBackendRecipientWallet",
  stableAmount: 100  // USDT to send
}
```

---

### **STEP 2: User Sends Payment**

**Token Movement #1: Payment Tokens**
```
User Wallet (100 USDT)
    ↓ [User sends via MetaMask]
    ↓
Backend Recipient Wallet (100 USDT)
    [Backend now owns payment tokens]
```

**User Transaction Hash:** `0xPaymentTxHash123...`

---

### **STEP 3: Frontend Verifies Payment**

**Frontend calls Nila-LatestFiles Backend:**
```javascript
POST http://nila-backend.com/verify-transaction
Body: {
  orderId: "ORD_1234567890",
  txHash: "0xPaymentTxHash123...",
  network: "BSC_USDT"
}
```

---

### **STEP 4: Backend Verifies On-Chain Payment**

**Backend Process:**
```javascript
1. Fetch transaction from blockchain
2. Verify:
   ✓ Transaction exists and confirmed
   ✓ Recipient = Backend wallet
   ✓ Sender = User wallet
   ✓ Amount = 100 USDT
   
3. Get token price from Chainlink oracle:
   - For stablecoins: $1.00
   - For native tokens: Real-time BNB/ETH/TRX price
   
4. Calculate NILA amount:
   - USD value = 100 USDT
   - NILA amount = $100 / $0.08 = 1,250 NILA
```

---

### **STEP 5: Backend Transfers NILA to Your Contract**

**Token Movement #2: NILA Transfer**
```
Their NILA Token Contract
    ↓ [Backend owner wallet has NILA supply]
    ↓
Backend Owner Wallet
    ↓ [Backend calls: nilaToken.transfer(yourContract, 1250 NILA)]
    ↓
YOUR Staking Contract (receives 1,250 NILA)
    [Your contract now has real NILA tokens]
```

**Backend Code:**
```javascript
// Transfer NILA from backend to your staking contract
const nilaTokenContract = new ethers.Contract(
  NILA_TOKEN_ADDRESS,
  ERC20_ABI,
  ownerWallet
);

const transferTx = await nilaTokenContract.transfer(
  YOUR_STAKING_CONTRACT_ADDRESS,
  ethers.parseUnits("1250", 18)
);

await transferTx.wait();
console.log("NILA transferred:", transferTx.hash);
```

---

### **STEP 6: Backend Creates Stake in Your Contract**

**Backend calls YOUR staking contract:**
```javascript
const stakeTx = await yourStakingContract.adminCreateStake(
  "0xUserAddress",           // User who owns the stake
  "1250000000000000000000",  // 1,250 NILA (in wei)
  30,                        // Lock days
  1200,                      // APR (12%)
  500                        // Instant reward BPS (5%)
);

await stakeTx.wait();
```

**Your Contract Logic:**
```solidity
function adminCreateStake(
    address user,
    uint256 amount,      // 1,250 NILA (already received)
    uint256 lockDays,
    uint256 apr,
    uint256 instantRewardBps
) external onlyOwner {
    // NILA already transferred to contract
    // Verify balance increased (optional)
    
    // Calculate instant rewards in NILA
    uint256 instantReward = (amount * instantRewardBps) / 10000;
    // 1,250 * 500 / 10000 = 62.5 NILA
    
    // Calculate referral rewards (if applicable)
    if (referrer != address(0)) {
        uint256 referralReward = (amount * referralBps) / 10000;
        uint256 referrerBonus = (amount * referrerBps) / 10000;
    }
    
    // Create stake record
    userStakes[user].push(StakeInfo({
        amount: amount,
        startTime: block.timestamp,
        unlockTime: block.timestamp + (lockDays * 1 days),
        aprSnapshot: apr,
        instantRewardSnapshot: instantReward,
        unstaked: false
    }));
    
    // Add instant rewards to claimable
    claimableInstantRewards[user] += instantReward;
    
    // Increment accounting
    totalStaked += amount;
    activeStakeCount[user]++;
}
```

**Backend Response to Frontend:**
```javascript
{
  success: true,
  pyrandSent: 1250,  // NILA amount staked
  tokenTx: "0xStakingTxHash456..."
}
```

---

### **STEP 7: User Claims Instant Rewards (Optional)**

**Token Movement #3: Instant Rewards**
```
YOUR Staking Contract (has 1,250 NILA)
    ↓ [User calls: claimInstantRewards()]
    ↓
User Wallet (receives 62.5 NILA)
    [Instant 5% cashback]
```

**Contract deducts from balance:**
- Started with: 1,250 NILA
- Paid out: 62.5 NILA
- Remaining: 1,187.5 NILA (for principal + APY)

---

### **STEP 8: APY Rewards Accrue Over Time**

**No token movement, just calculation:**
```
Every second that passes:
  Pending APY = (1,250 NILA * 12% * timeElapsed) / 365 days
  
After 30 days:
  APY rewards = 1,250 * 12% * (30/365) ≈ 12.33 NILA
```

---

### **STEP 9: User Unstakes After Lock Period**

**Token Movement #4: Principal + APY Payout**
```
YOUR Staking Contract
    ↓ [User calls: unstake(stakeIndex)]
    ↓ [Contract calculates total payout]
    ↓
User Wallet
    Receives:
    - Principal: 1,250 NILA
    - APY rewards: 12.33 NILA
    - Total: 1,262.33 NILA
```

---

## Token Flow Summary

### **Payment Tokens (USDT/USDC/BNB/ETH/TRX)**

```
User Wallet
    ↓ (User sends payment)
Backend Recipient Wallet
    [Backend keeps as revenue]
```

### **NILA Tokens**

```
Their NILA Token Contract (Backend's supply)
    ↓ (Backend transfers)
YOUR Staking Contract
    ↓ (Instant rewards - optional)
User Wallet (62.5 NILA)
    
YOUR Staking Contract (holding principal)
    ↓ (After lock period - unstake)
User Wallet (1,262.33 NILA total)
```

---

## Token Accounting

### **Backend's Perspective:**
| Action | Token | Amount | Direction |
|--------|-------|--------|-----------|
| Receive payment | USDT | 100 | IN |
| Transfer NILA | NILA | 1,250 | OUT |
| **Net Result** | - | Sold 1,250 NILA for 100 USDT | - |

### **Your Contract's Perspective:**
| Action | Token | Amount | Direction |
|--------|-------|--------|-----------|
| Receive from backend | NILA | 1,250 | IN |
| Instant rewards | NILA | 62.5 | OUT |
| Principal + APY | NILA | 1,262.33 | OUT (later) |
| **Net Result** | NILA | -74.83 | Deficit covered by backend transfers |

### **User's Perspective:**
| Action | Token | Amount | Direction |
|--------|-------|--------|-----------|
| Pay | USDT | 100 | OUT |
| Instant rewards | NILA | 62.5 | IN |
| Principal + APY | NILA | 1,262.33 | IN (later) |
| **Net Result** | - | Paid 100 USDT, got 1,324.83 NILA total | - |

---

## Supported Networks & Tokens

### **BSC (Binance Smart Chain)**
- USDT (BEP-20)
- USDC (BEP-20)
- BNB (native)

### **Ethereum**
- USDT (ERC-20)
- USDC (ERC-20)
- ETH (native)

### **TRON**
- USDT (TRC-20)
- TRX (native)

---

## Price Oracle Integration

The backend uses **Chainlink Price Feeds** to get real-time prices:

### **BSC Chainlink Oracle**
- Address: `0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE`
- Feed: BNB/USD

### **Ethereum Chainlink Oracle**
- Address: `0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419`
- Feed: ETH/USD

### **TRON Chainlink Oracle**
- Address: `TC6o8AakUg4Xz9nHY9qXpJNsgF7CQkwBqF`
- Feed: TRX/USD

**Price Calculation Example:**
```javascript
// User pays 0.5 BNB
const bnbPrice = await chainlink.latestAnswer(); // $600
const usdValue = 0.5 * 600 = $300
const nilaAmount = 300 / 0.08 = 3,750 NILA
```

---

## Reward Types

### **1. Instant Rewards (Cashback)**
- Paid immediately in NILA
- Based on amount config (e.g., 5%)
- Only for predefined packages
- Claimable right after staking

### **2. Referral Rewards**
- Paid in NILA
- Referrer gets: 5% of stake amount
- Referred user gets: 2% bonus
- Claimable immediately

### **3. APY Rewards**
- Accrued over time in NILA
- Based on lock duration and APR
- Claimable every 30 days
- Paid out with principal at unstake

---

## Security Considerations

### **Backend Security**
- Private key management for owner wallet
- Transaction verification before NILA transfer
- Idempotency checks (prevent double-processing)
- Rate limiting on API endpoints

### **Contract Security**
- Only owner can call `adminCreateStake()`
- Reentrancy guards on all functions
- Balance checks before transfers
- Pausable in emergency

### **User Security**
- Payment verification on-chain
- No direct contract interaction needed
- Clear transaction history
- Transparent reward calculations

---

## Error Handling

### **Common Errors**

**1. Insufficient NILA in Backend Wallet**
```
Error: Backend doesn't have enough NILA to transfer
Solution: Backend must maintain NILA supply
```

**2. Payment Verification Failed**
```
Error: Transaction not found or invalid
Solution: User must send correct amount to correct address
```

**3. Contract Balance Insufficient**
```
Error: Contract can't pay rewards
Solution: Backend must transfer NILA before creating stake
```

---

## Future Enhancements

### **Potential Improvements**
1. **Automatic NILA Purchase**: Backend could swap payment tokens for NILA on DEX
2. **Dynamic Pricing**: Adjust NILA price based on market conditions
3. **Multi-Token Rewards**: Allow users to choose reward token
4. **Compound Staking**: Auto-restake rewards
5. **NFT Rewards**: Bonus NFTs for large stakes

---

## Conclusion

This token flow architecture provides:
- ✅ **Clean separation of concerns**: Backend handles sales, contract handles staking
- ✅ **Multi-chain support**: Users can pay with any supported token
- ✅ **Real-time pricing**: Chainlink oracles ensure fair conversion
- ✅ **Transparent accounting**: All token movements are on-chain
- ✅ **Flexible rewards**: Instant, referral, and APY rewards in NILA

The backend acts as the **NILA treasury and payment gateway**, while your contract acts as the **staking platform and reward distributor**.
