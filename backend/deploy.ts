import { ethers } from "hardhat";

async function main() {
  const NILA_TOKEN = "0xA31fb7667F80306690F5DF0d9A6ea272aBF97926";

  console.log("Deploying NilaStaking contract...");
  console.log("NILA Token Address:", NILA_TOKEN);

  const Staking = await ethers.getContractFactory("NilaStaking");
  const staking = await Staking.deploy(NILA_TOKEN);

  await staking.waitForDeployment();

  const deployedAddress = await staking.getAddress();
  console.log("✅ NilaStaking deployed to:", deployedAddress);
  console.log("\nNext steps:");
  console.log("1. Verify contract on BscScan: https://testnet.bscscan.com/");
  console.log("2. Fund the contract with NILA tokens for rewards");
  console.log("3. Add amount and lock configurations");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
