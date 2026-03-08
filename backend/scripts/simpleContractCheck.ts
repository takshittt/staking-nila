import { ethers } from "hardhat";

async function main() {
  const STAKING_CONTRACT_ADDRESS = process.env.STAKING_CONTRACT_ADDRESS || "0x06a38fb94a1A35dCE9A5f2e6a640B9c559F34333";
  
  console.log("Simple Contract Check");
  console.log("Contract:", STAKING_CONTRACT_ADDRESS);
  console.log("=".repeat(80));

  const provider = ethers.provider;
  
  // Check if contract exists
  const code = await provider.getCode(STAKING_CONTRACT_ADDRESS);
  console.log(`Contract code length: ${code.length} bytes`);
  
  if (code === "0x") {
    console.log("❌ No contract deployed at this address!");
    return;
  }

  console.log("✅ Contract exists at this address");

  // Try basic calls
  const NilaStaking = await ethers.getContractAt("NilaStakingUpgradeable", STAKING_CONTRACT_ADDRESS);

  console.log("\nTrying basic contract calls:");
  console.log("-".repeat(80));

  try {
    const totalStaked = await NilaStaking.totalStaked();
    console.log(`✅ totalStaked: ${ethers.formatUnits(totalStaked, 18)} NILA`);
  } catch (error: any) {
    console.log(`❌ totalStaked failed: ${error.message}`);
  }

  try {
    const uniqueStakers = await NilaStaking.uniqueStakers();
    console.log(`✅ uniqueStakers: ${uniqueStakers}`);
  } catch (error: any) {
    console.log(`❌ uniqueStakers failed: ${error.message}`);
  }

  try {
    const nilaToken = await NilaStaking.nila();
    console.log(`✅ NILA token: ${nilaToken}`);
  } catch (error: any) {
    console.log(`❌ nila() failed: ${error.message}`);
  }

  // Try reward tier count with raw call
  console.log("\nTrying getRewardTierCount with raw call:");
  console.log("-".repeat(80));
  
  try {
    // Get function selector for getRewardTierCount()
    const iface = new ethers.Interface([
      "function getRewardTierCount() view returns (uint256)"
    ]);
    const data = iface.encodeFunctionData("getRewardTierCount", []);
    
    console.log(`Function selector: ${data}`);
    
    const result = await provider.call({
      to: STAKING_CONTRACT_ADDRESS,
      data: data
    });
    
    console.log(`Raw result: ${result}`);
    
    if (result === "0x") {
      console.log("❌ Function returned empty data - function doesn't exist in deployed contract");
      console.log("\n🔴 ROOT CAUSE: The deployed contract is an OLD VERSION without reward tiers!");
      console.log("\n📝 SOLUTION: You need to upgrade the contract:");
      console.log("   1. Compile: npx hardhat compile");
      console.log("   2. Upgrade: npx hardhat run scripts/upgradeProxy.ts --network bscMainnet");
    } else {
      const decoded = iface.decodeFunctionResult("getRewardTierCount", result);
      console.log(`✅ Reward tier count: ${decoded[0]}`);
      
      if (decoded[0] === 0n) {
        console.log("\n⚠️  Contract has reward tier functions but NO TIERS CONFIGURED!");
        console.log("\n📝 SOLUTION: Setup reward tiers:");
        console.log("   npx hardhat run scripts/setupRewardTiers.ts --network bscMainnet");
      }
    }
  } catch (error: any) {
    console.log(`❌ Raw call failed: ${error.message}`);
  }

  console.log("\n" + "=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
