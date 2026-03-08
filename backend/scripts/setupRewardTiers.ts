import { ethers } from "hardhat";

async function main() {
  const STAKING_CONTRACT_ADDRESS = process.env.STAKING_CONTRACT_ADDRESS || process.env.CONTRACT_ADDRESS || "0xb6BFE033da936DaE74b35C98df00992675f47a3C";
  
  console.log("Setting up Reward Tiers for contract:", STAKING_CONTRACT_ADDRESS);
  console.log("=".repeat(80));

  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  const NilaStaking = await ethers.getContractAt("NilaStakingUpgradeable", STAKING_CONTRACT_ADDRESS);

  // Check if tiers already exist
  const existingTierCount = await NilaStaking.getRewardTierCount();
  console.log(`\nExisting Reward Tiers: ${existingTierCount}`);

  if (existingTierCount > 0n) {
    console.log("\n⚠️  Reward tiers already exist. Displaying current configuration:");
    console.log("-".repeat(80));
    
    for (let i = 0; i < Number(existingTierCount); i++) {
      const tier = await NilaStaking.getRewardTier(i);
      const minNila = ethers.formatUnits(tier.minNilaAmount, 18);
      const maxNila = tier.maxNilaAmount === 0n ? "Unlimited" : ethers.formatUnits(tier.maxNilaAmount, 18);
      const rewardPercent = (Number(tier.instantRewardBps) / 100).toFixed(2);
      const active = tier.active ? "Active" : "Inactive";

      console.log(`Tier ${i}: ${minNila} - ${maxNila} NILA = ${rewardPercent}% (${active})`);
    }

    console.log("\nTo add more tiers or update existing ones, modify this script.");
    return;
  }

  console.log("\n📝 Creating Reward Tiers...");
  console.log("-".repeat(80));

  // Define reward tiers
  // Format: [minNila, maxNila, rewardPercent]
  // maxNila = 0 means unlimited
  const tiers = [
    { min: 0, max: 500, reward: 10 },      // 0-500 NILA = 10%
    { min: 501, max: 1000, reward: 12 },   // 501-1000 NILA = 12%
    { min: 1001, max: 5000, reward: 15 },  // 1001-5000 NILA = 15%
    { min: 5001, max: 0, reward: 20 }      // 5001+ NILA = 20%
  ];

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const minWei = ethers.parseUnits(tier.min.toString(), 18);
    const maxWei = tier.max === 0 ? 0n : ethers.parseUnits(tier.max.toString(), 18);
    const rewardBps = tier.reward * 100; // Convert percentage to basis points

    console.log(`\nAdding Tier ${i}:`);
    console.log(`  Range: ${tier.min} - ${tier.max === 0 ? 'Unlimited' : tier.max} NILA`);
    console.log(`  Reward: ${tier.reward}%`);

    const tx = await NilaStaking.addRewardTier(minWei, maxWei, rewardBps);
    console.log(`  Transaction: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`  ✅ Confirmed in block ${receipt?.blockNumber}`);
  }

  console.log("\n" + "=".repeat(80));
  console.log("✅ Reward Tiers Setup Complete!");
  console.log("\nRun 'npx hardhat run scripts/checkRewardTiers.ts --network <network>' to verify.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
