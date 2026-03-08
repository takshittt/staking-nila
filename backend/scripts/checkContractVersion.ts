import { ethers } from "hardhat";

async function main() {
  const STAKING_CONTRACT_ADDRESS = process.env.STAKING_CONTRACT_ADDRESS || "0x06a38fb94a1A35dCE9A5f2e6a640B9c559F34333";
  
  console.log("Checking contract version at:", STAKING_CONTRACT_ADDRESS);
  console.log("=".repeat(80));

  const NilaStaking = await ethers.getContractAt("NilaStakingUpgradeable", STAKING_CONTRACT_ADDRESS);

  try {
    const version = await NilaStaking.version();
    console.log(`Contract Version: ${version}`);
  } catch (error) {
    console.log("❌ version() function not found - very old contract");
  }

  // Check which functions exist
  console.log("\nChecking available functions:");
  console.log("-".repeat(80));

  const functionsToCheck = [
    "getRewardTierCount",
    "addRewardTier",
    "updateRewardTier",
    "calculateInstantReward",
    "buyWithToken",
    "claimableInstantRewards"
  ];

  for (const funcName of functionsToCheck) {
    try {
      // Try to get the function
      const func = NilaStaking.interface.getFunction(funcName);
      console.log(`✅ ${funcName} - EXISTS`);
    } catch (error) {
      console.log(`❌ ${funcName} - NOT FOUND`);
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("\n🔍 Diagnosis:");
  console.log("-".repeat(80));
  console.log("The deployed contract is missing reward tier functions.");
  console.log("You need to upgrade the contract to the latest version.");
  console.log("\nTo upgrade:");
  console.log("  npx hardhat run scripts/upgradeProxy.ts --network bscMainnet");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
