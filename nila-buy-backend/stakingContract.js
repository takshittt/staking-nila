// stakingContract.js

/**
 * ============================================
 *  STAKING CONTRACT CONFIGURATION
 * ============================================
 *
 * IMPORTANT:
 * - Contract owner MUST be the same wallet as OWNER_PRIVATE_KEY in .env
 * - Contract must include buyWithToken() function for Buy & Stake flow
 * - This is NilaStakingUpgradeable contract
 *
 */

export default function getStakingConfig() {
  return {
    
    // Deployed staking contract address (from .env)
    stakingAddress: process.env.STAKING_CONTRACT_ADDRESS,

    // Contract ABI - Only functions we need
    stakingAbi: [
      {
        "inputs": [
          {"internalType": "address", "name": "user", "type": "address"},
          {"internalType": "uint256", "name": "nilaAmount", "type": "uint256"},
          {"internalType": "uint256", "name": "lockDays", "type": "uint256"},
          {"internalType": "uint256", "name": "apr", "type": "uint256"},
          {"internalType": "address", "name": "referrer", "type": "address"}
        ],
        "name": "buyWithToken",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {"internalType": "address", "name": "user", "type": "address"},
          {"internalType": "uint256", "name": "amount", "type": "uint256"},
          {"internalType": "uint256", "name": "lockDays", "type": "uint256"},
          {"internalType": "uint256", "name": "apr", "type": "uint256"}
        ],
        "name": "adminCreateStake",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ]

  };
}
