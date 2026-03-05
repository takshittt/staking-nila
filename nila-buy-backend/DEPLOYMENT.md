# NILAClaimContract Deployment Guide

## Prerequisites

- Node.js and npm installed
- BSCScan API key (get from https://bscscan.com/myapikey)
- Testnet BNB for gas fees (get from https://testnet.bnbchain.org/faucet-smart)

## Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables in `backend/.env`:
```env
OWNER_PRIVATE_KEY=your_private_key_here
BSCSCAN_API_KEY=your_bscscan_api_key_here
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545
```

## Deployment

### Compile the contract:
```bash
npm run compile
```

### Deploy to BSC Testnet:
```bash
npm run deploy:bscTestnet
```

### Deploy to BSC Mainnet:
```bash
npm run deploy:bsc
```

### Deploy to Ethereum Sepolia:
```bash
npm run deploy:ethSepolia
```

Deployment info will be saved to `backend/deployments/{network}-deployment.json`

## Verification

### Verify on BSC Testnet:
```bash
npm run verify:bscTestnet
```

### Verify on BSC Mainnet:
```bash
npm run verify:bsc
```

### Manual verification using contract address:
```bash
npx hardhat verify --network bscTestnet <CONTRACT_ADDRESS>
```

## Post-Deployment

After deployment, you need to:

1. **Fund the contract** with tokens using the `deposit()` function
2. **Set the signer wallet** if different from deployer using `setSigner()`
3. **Update the token address** in the contract if needed (hardcoded in constructor)

## Contract Functions

- `deposit(amount)` - Owner deposits tokens into the contract
- `claimTokens(voucher)` - Users claim tokens with a signed voucher
- `withdraw(amount)` - Owner withdraws tokens from the contract
- `setSigner(address)` - Owner sets the signer wallet address
- `claimTokensOwner(recipient, amount)` - Owner manually sends tokens to a recipient

## Deployed Contracts

### BSC Testnet
- Contract: `0x1ac15bC1741f64221E22059C9f3B3A6ef8705E1c`
- Explorer: https://testnet.bscscan.com/address/0x1ac15bC1741f64221E22059C9f3B3A6ef8705E1c

## Notes

- The contract uses EIP-712 signatures for secure token claims
- Each user can only claim once (tracked by `hasClaimed` mapping)
- Each voucher nonce can only be used once
- Owner must approve the contract to spend tokens before calling `deposit()`
