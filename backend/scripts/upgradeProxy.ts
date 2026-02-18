import { ethers, upgrades } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  // Get proxy address from command line or environment
  const PROXY_ADDRESS = process.env.PROXY_ADDRESS || "";

  if (!PROXY_ADDRESS) {
    console.error("❌ Error: PROXY_ADDRESS not provided");
    console.log("\nUsage:");
    console.log("  PROXY_ADDRESS=0x... npx hardhat run scripts/upgradeProxy.ts --network <network>");
    process.exit(1);
  }

  console.log("========================================");
  console.log("Upgrading NilaStakingUpgradeable Proxy");
  console.log("========================================");
  console.log("Proxy Address:", PROXY_ADDRESS);
  console.log("Upgrader:", (await ethers.provider.getSigner()).address);

  // Get current implementation
  const currentImplementation = await upgrades.erc1967.getImplementationAddress(PROXY_ADDRESS);
  console.log("Current Implementation:", currentImplementation);

  // Get current version
  const proxyContract = await ethers.getContractAt("NilaStakingUpgradeable", PROXY_ADDRESS);
  try {
    const currentVersion = await proxyContract.version();
    console.log("Current Version:", currentVersion);
  } catch (e) {
    console.log("Current Version: Unable to retrieve (version() may not exist)");
  }

  console.log("\n🔄 Deploying new implementation...");

  // Deploy new implementation
  const NilaStakingUpgradeableV2 = await ethers.getContractFactory("NilaStakingUpgradeable");
  
  const upgraded = await upgrades.upgradeProxy(PROXY_ADDRESS, NilaStakingUpgradeableV2, {
    kind: "uups",
  });

  await upgraded.waitForDeployment();

  // Get new implementation address
  const newImplementation = await upgrades.erc1967.getImplementationAddress(PROXY_ADDRESS);
  console.log("✅ New Implementation:", newImplementation);

  // Verify upgrade
  try {
    const newVersion = await upgraded.version();
    console.log("✅ New Version:", newVersion);
  } catch (e) {
    console.log("New Version: Unable to retrieve");
  }

  // Verify state preservation
  console.log("\n🔍 Verifying state preservation...");
  const totalStaked = await upgraded.totalStaked();
  const uniqueStakers = await upgraded.uniqueStakers();
  console.log("Total Staked:", ethers.formatEther(totalStaked), "NILA");
  console.log("Unique Stakers:", uniqueStakers.toString());

  // Save upgrade info
  const upgradeInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    proxy: PROXY_ADDRESS,
    oldImplementation: currentImplementation,
    newImplementation: newImplementation,
    upgradedAt: new Date().toISOString(),
    upgrader: (await ethers.provider.getSigner()).address,
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const filename = `upgrade-${upgradeInfo.chainId}-${Date.now()}.json`;
  const filepath = path.join(deploymentsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(upgradeInfo, null, 2));

  console.log("\n========================================");
  console.log("Upgrade Info saved to:", filepath);
  console.log("========================================");

  console.log("\n✅ Upgrade completed successfully!");
  console.log("\n📋 Next Steps:");
  console.log("1. Verify new implementation on block explorer");
  console.log("2. Test all existing functions");
  console.log("3. Test new functions (if any)");
  console.log("4. Monitor contract behavior");

  return {
    proxy: PROXY_ADDRESS,
    oldImplementation: currentImplementation,
    newImplementation: newImplementation,
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
