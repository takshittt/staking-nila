import { ethers, upgrades } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const NILA_TOKEN = process.env.NILA_TOKEN_ADDRESS || "0x00f8Da33734FeB9b946fEC2228C25072D2e2E41f";

  console.log("========================================");
  console.log("Deploying NilaStakingUpgradeable v3.0.0 with UUPS Proxy");
  console.log("========================================");
  console.log("NILA Token Address:", NILA_TOKEN);
  console.log("Deployer:", (await ethers.provider.getSigner()).address);

  // Deploy proxy
  const NilaStakingUpgradeable = await ethers.getContractFactory("NilaStakingUpgradeable");
  
  console.log("\nDeploying proxy...");
  const proxy = await upgrades.deployProxy(
    NilaStakingUpgradeable,
    [NILA_TOKEN],
    {
      initializer: "initialize",
      kind: "uups",
    }
  );

  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();

  console.log("✅ Proxy deployed to:", proxyAddress);

  // Get implementation address
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("✅ Implementation deployed to:", implementationAddress);

  // Get admin address (for UUPS, this is typically the proxy itself)
  const adminAddress = await upgrades.erc1967.getAdminAddress(proxyAddress);
  console.log("✅ Admin address:", adminAddress);

  // Verify version
  try {
    const version = await proxy.version();
    console.log("✅ Contract Version:", version);
  } catch (e) {
    console.log("Version check skipped");
  }

  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    proxy: proxyAddress,
    implementation: implementationAddress,
    admin: adminAddress,
    nilaToken: NILA_TOKEN,
    deployedAt: new Date().toISOString(),
    deployer: (await ethers.provider.getSigner()).address,
    version: "3.0.0",
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const filename = `deployment-${deploymentInfo.chainId}-${Date.now()}.json`;
  const filepath = path.join(deploymentsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));

  console.log("\n========================================");
  console.log("Deployment Info saved to:", filepath);
  console.log("========================================");

  // Update .env file with new addresses
  console.log("\nUpdating .env file...");
  const envPath = path.join(__dirname, "..", ".env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf-8");
    
    if (envContent.includes("CONTRACT_ADDRESS=")) {
      envContent = envContent.replace(/CONTRACT_ADDRESS=.*/, `CONTRACT_ADDRESS=${proxyAddress}`);
    } else {
      envContent += `\nCONTRACT_ADDRESS=${proxyAddress}`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log("✅ Updated CONTRACT_ADDRESS in .env to:", proxyAddress);
  }

  console.log("\n📋 Next Steps:");
  console.log("1. Verify proxy on block explorer");
  console.log("2. Fund contract with NILA tokens for rewards");
  console.log("3. Add lock configurations via admin panel");
  console.log("4. Add reward tiers via admin panel");
  console.log("5. Test all functions through the proxy");
  console.log("\n💡 Important:");
  console.log("- Always interact with the PROXY address:", proxyAddress);
  console.log("- Never send tokens to the implementation address");
  console.log("- Keep this deployment info safe for future upgrades");
  console.log("- CONTRACT_ADDRESS in .env has been automatically updated");
  console.log("- Amount configs are reference-only (not enforced by contract)");
  console.log("- Reward tiers are contract-enforced for instant rewards");

  return {
    proxy: proxyAddress,
    implementation: implementationAddress,
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
