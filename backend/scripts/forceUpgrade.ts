import { ethers, upgrades } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const PROXY_ADDRESS = process.env.PROXY_ADDRESS || "";

  if (!PROXY_ADDRESS) {
    console.error("❌ Error: PROXY_ADDRESS not provided");
    process.exit(1);
  }

  console.log("========================================");
  console.log("Force Upgrading NilaStakingUpgradeable");
  console.log("========================================");
  console.log("Proxy Address:", PROXY_ADDRESS);

  // Get current implementation
  const currentImplementation = await upgrades.erc1967.getImplementationAddress(PROXY_ADDRESS);
  console.log("Current Implementation:", currentImplementation);

  console.log("\n🔄 Deploying new implementation (forced)...");

  // Deploy new implementation with redeployImplementation option
  const NilaStakingUpgradeable = await ethers.getContractFactory("NilaStakingUpgradeable");
  
  const upgraded = await upgrades.upgradeProxy(PROXY_ADDRESS, NilaStakingUpgradeable, {
    kind: "uups",
    redeployImplementation: "always", // Force redeploy
  });

  await upgraded.waitForDeployment();

  // Get new implementation address
  const newImplementation = await upgrades.erc1967.getImplementationAddress(PROXY_ADDRESS);
  console.log("✅ New Implementation:", newImplementation);

  // Check MIN_STAKE_AMOUNT
  const minStake = await upgraded.MIN_STAKE_AMOUNT();
  console.log("✅ MIN_STAKE_AMOUNT:", ethers.formatEther(minStake), "NILA");

  // Save upgrade info
  const upgradeInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    proxy: PROXY_ADDRESS,
    oldImplementation: currentImplementation,
    newImplementation: newImplementation,
    minStakeAmount: ethers.formatEther(minStake),
    upgradedAt: new Date().toISOString(),
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const filename = `force-upgrade-${upgradeInfo.chainId}-${Date.now()}.json`;
  const filepath = path.join(deploymentsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(upgradeInfo, null, 2));

  console.log("\n✅ Force upgrade completed!");
  console.log("Upgrade info saved to:", filename);

  return upgradeInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
