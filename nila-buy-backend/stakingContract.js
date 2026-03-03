// stakingContract.js

/**
 * ============================================
 *  STAKING CONTRACT CONFIGURATION
 * ============================================
 *
 * Client must:
 * 1. Add deployed staking contract address
 * 2. Add full contract ABI array
 *
 * IMPORTANT:
 * - Contract owner MUST be the same wallet as OWNER_PRIVATE_KEY in .env
 * - Contract must include adminCreateStake() function
 *
 */

export default {
  
  //  ADD YOUR DEPLOYED STAKING CONTRACT ADDRESS BELOW
  // Example: "0x1234...."
  stakingAddress: "0x1ac15bC1741f64221E22059C9f3B3A6ef8705E1c",

  // ADD FULL CONTRACT ABI ARRAY BELOW
  // Paste full ABI JSON array here
  stakingAbi: [

  ]

};
