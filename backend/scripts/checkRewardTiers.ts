import { ethers } from "hardhat";

async function main() {
  const STAKING_CONTRACT_ADDRESS = process.env.STAKING_CONTRACT_ADDRESS || process.env.CONTRACT_ADDRESS || "0xb6BFE033da936DaE74b35C98df00992675f47a3C";
  
  console.log("Checking Reward Tiers for contract:", STAKING_CONTRACT_ADDRESS);
  console.log("=".repeat(80));

  const NilaStaking = await ethers.getContractAt("NilaStakingUpgradeable", STAKING_CONTRACT_ADDRESS);

  // Get reward tier count
  const tierCount = await NilaStaking.getRewardTierCount();
  console.log(`\nTotal Reward Tiers: ${tierCount}`);
  console.log("-".repeat(80));

  if (tierCount === 0n) {
    console.log("\n❌ NO REWARD TIERS CONFIGURED!");
    console.log("This is why you're not seeing instant rewards.");
    console.log("\nTo fix this, run: npx hardhat run scripts/setupRewardTiers.ts --network <network>");
    return;
  }

  // Display each tier
  for (let i = 0; i < Number(tierCount); i++) {
    const tier = await NilaStaking.getRewardTier(i);
    const minNila = ethers.formatUnits(tier.minNilaAmount, 18);
    const maxNila = tier.maxNilaAmount === 0n ? "Unlimited" : ethers.formatUnits(tier.maxNilaAmount, 18);
    const rewardPercent = (Number(tier.instantRewardBps) / 100).toFixed(2);
    const active = tier.active ? "✅ Active" : "❌ Inactive";

    console.log(`\nTier ${i}:`);
    console.log(`  Range: ${minNila} - ${maxNila} NILA`);
    console.log(`  Instant Reward: ${rewardPercent}%`);
    console.log(`  Status: ${active}`);
  }

  console.log("\n" + "=".repeat(80));

  // Test calculation for common amounts
  console.log("\nTest Calculations:");
  console.log("-".repeat(80));
  
  const testAmounts = [100, 250, 500, 750, 1000];
  
  for (const amount of testAmounts) {
    const amountWei = ethers.parseUnits(amount.toString(), 18);
    const reward = await NilaStaking.calculateInstantReward(amountWei);
    const rewardNila = ethers.formatUnits(reward, 18);
    const percentage = reward > 0n ? ((Number(reward) / Number(amountWei)) * 100).toFixed(2) : "0";
    
    console.log(`${amount} NILA → ${rewardNila} NILA instant reward (${percentage}%)`);
  }

  console.log("\n" + "=".repeat(80));

  // Check contract balance
  const nilaAddress = await NilaStaking.nila();
  const NILA = await ethers.getContractAt("IERC20", nilaAddress);
  const contractBalance = await NILA.balanceOf(STAKING_CONTRACT_ADDRESS);
  const totalStaked = await NilaStaking.totalStaked();
  const availableRewards = await NilaStaking.availableRewards();

  console.log("\nContract Status:");
  console.log("-".repeat(80));
  console.log(`NILA Token: ${nilaAddress}`);
  console.log(`Contract Balance: ${ethers.formatUnits(contractBalance, 18)} NILA`);
  console.log(`Total Staked: ${ethers.formatUnits(totalStaked, 18)} NILA`);
  console.log(`Available Rewards: ${ethers.formatUnits(availableRewards, 18)} NILA`);

  if (availableRewards === 0n) {
    console.log("\n⚠️  WARNING: No rewards available in the pool!");
    console.log("The contract needs NILA tokens to pay out instant rewards.");
  }

  console.log("\n" + "=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
