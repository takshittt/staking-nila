// nilaToken.js

/**
 * ============================================
 *  NILA TOKEN CONFIGURATION
 * ============================================
 *
 * ERC20 token contract for NILA
 * Used to transfer NILA from backend wallet to staking contract
 *
 */

export default function getNilaTokenConfig() {
  return {
    
    // NILA Token address (from .env)
    nilaAddress: process.env.NILA_TOKEN_ADDRESS,

    // Standard ERC20 ABI - Only functions we need
    nilaAbi: [
      {
        "inputs": [
          {"internalType": "address", "name": "to", "type": "address"},
          {"internalType": "uint256", "name": "amount", "type": "uint256"}
        ],
        "name": "transfer",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {"internalType": "address", "name": "account", "type": "address"}
        ],
        "name": "balanceOf",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "decimals",
        "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
        "stateMutability": "view",
        "type": "function"
      }
    ]

  };
}
