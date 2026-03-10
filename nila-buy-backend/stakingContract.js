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
      },
      {
        "inputs": [{"internalType": "address", "name": "", "type": "address"}],
        "name": "claimableInstantRewards",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{"internalType": "address", "name": "", "type": "address"}],
        "name": "claimableReferralRewards",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
        "name": "getUserStakeCount",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
        "name": "getUserStakes",
        "outputs": [
          {
            "components": [
              {"internalType": "uint256", "name": "amount", "type": "uint256"},
              {"internalType": "uint256", "name": "startTime", "type": "uint256"},
              {"internalType": "uint256", "name": "lastClaimTime", "type": "uint256"},
              {"internalType": "uint256", "name": "unlockTime", "type": "uint256"},
              {"internalType": "uint256", "name": "aprSnapshot", "type": "uint256"},
              {"internalType": "uint256", "name": "instantRewardSnapshot", "type": "uint256"},
              {"internalType": "bool", "name": "unstaked", "type": "bool"}
            ],
            "internalType": "struct NilaStakingUpgradeable.StakeInfo[]",
            "name": "",
            "type": "tuple[]"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "getRewardTierCount",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{"internalType": "uint256", "name": "id", "type": "uint256"}],
        "name": "getRewardTier",
        "outputs": [
          {"internalType": "uint256", "name": "minNilaAmount", "type": "uint256"},
          {"internalType": "uint256", "name": "maxNilaAmount", "type": "uint256"},
          {"internalType": "uint256", "name": "instantRewardBps", "type": "uint256"},
          {"internalType": "bool", "name": "active", "type": "bool"}
        ],
        "stateMutability": "view",
        "type": "function"
      }
    ]

  };
}
