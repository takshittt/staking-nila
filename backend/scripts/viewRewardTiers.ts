import { ethers } from "hardhat";

async function main() {
  const STAKING_CONTRACT_ADDRESS = process.env.STAKING_CONTRACT_ADDRESS || process.env.CONTRACT_ADDRESS || "0xb6BFE033da936DaE74b35C98df00992675f47a3C";
  
  console.log("Viewing Reward Tiers");
  console.log("Contract:", STAKING_CONTRACT_ADDRESS);
  console.log("=".repeat(80));

  const NilaStaking = await ethers.getContractAt("NilaStakingUpgradeable", STAKING_CONTRACT_ADDRESS);

  // Get reward tier count using raw call
  const provider = ethers.provider;
  const iface = new ethers.Interface([
    "function getRewardTierCount() view returns (uint256)",
    "function getRewardTier(uint256) view returns (uint256, uint256, uint256, bool)"
  ]);
  
  const countData = iface.encodeFunctionData("getRewardTierCount", []);
  const countResult = await provider.call({
    to: STAKING_CONTRACT_ADDRESS,
    data: countData
  });
  
  const tierCount = iface.decodeFunctionResult("getRewardTierCount", countResult)[0];
  
  console.log(`\nTotal Reward Tiers: ${tierCount}`);
  console.log("-".repeat(80));

  // Display each tier
  for (let i = 0; i < Number(tierCount); i++) {
    const tierData = iface.encodeFunctionData("getRewardTier", [i]);
    const tierResult = await provider.call({
      to: STAKING_CONTRACT_ADDRESS,
      data: tierData
    });
    
    const decoded = iface.decodeFunctionResult("getRewardTier", tierResult);
    const minNila = ethers.formatUnits(decoded[0], 18);
    const maxNila = decoded[1] === 0n ? "Unlimited" : ethers.formatUnits(decoded[1], 18);
    const rewardPercent = (Number(decoded[2]) / 100).toFixed(2);
    const active = decoded[3] ? "✅ Active" : "❌ Inactive";

    console.log(`\nTier ${i}:`);
    console.log(`  Range: ${minNila} - ${maxNila} NILA`);
    console.log(`  Instant Reward: ${rewardPercent}%`);
    console.log(`  Status: ${active}`);
  }

  console.log("\n" + "=".repeat(80));

  // Test calculation for common amounts
  console.log("\nTest Calculations:");
  console.log("-".repeat(80));
  
  const testAmounts = [100, 250, 500, 750, 1000, 5000];
  
  const calcIface = new ethers.Interface([
    "function calculateInstantReward(uint256) view returns (uint256)"
  ]);
  
  for (const amount of testAmounts) {
    const amountWei = ethers.parseUnits(amount.toString(), 18);
    const calcData = calcIface.encodeFunctionData("calculateInstantReward", [amountWei]);
    const calcResult = await provider.call({
      to: STAKING_CONTRACT_ADDRESS,
      data: calcData
    });
    
    const reward = calcIface.decodeFunctionResult("calculateInstantReward", calcResult)[0];
    const rewardNila = ethers.formatUnits(reward, 18);
    const percentage = reward > 0n ? ((Number(reward) / Number(amountWei)) * 100).toFixed(2) : "0";
    
    console.log(`${amount} NILA → ${rewardNila} NILA instant reward (${percentage}%)`);
  }

  console.log("\n" + "=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
