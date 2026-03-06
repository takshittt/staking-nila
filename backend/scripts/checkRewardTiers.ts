import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  
  if (!contractAddress) {
    throw new Error("CONTRACT_ADDRESS not found in .env");
  }

  console.log("Checking reward tiers for contract:", contractAddress);
  console.log("Network: BSC Mainnet");
  console.log("---");

  // Get contract instance
  const NilaStaking = await ethers.getContractFactory("NilaStakingUpgradeable");
  const contract = NilaStaking.attach(contractAddress);

  // Get reward tier count
  const tierCount = await contract.getRewardTierCount();
  console.log(`Total Reward Tiers: ${tierCount.toString()}`);
  console.log("---");

  if (tierCount.toString() === "0") {
    console.log("⚠️  No reward tiers configured on mainnet contract");
    return;
  }

  // Get each tier
  for (let i = 0; i < Number(tierCount); i++) {
    const tier = await contract.getRewardTier(i);
    const [minAmount, maxAmount, instantRewardBps, active] = tier;
    
    console.log(`Tier ${i}:`);
    console.log(`  Min NILA Amount: ${ethers.formatEther(minAmount)} NILA`);
    console.log(`  Max NILA Amount: ${maxAmount.toString() === "0" ? "Unlimited" : ethers.formatEther(maxAmount) + " NILA"}`);
    console.log(`  Instant Reward: ${(Number(instantRewardBps) / 100).toFixed(2)}%`);
    console.log(`  Active: ${active ? "✅ Yes" : "❌ No"}`);
    console.log("---");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
