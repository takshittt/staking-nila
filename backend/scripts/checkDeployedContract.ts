import { ethers, upgrades } from "hardhat";

async function main() {
  const PROXY_ADDRESS = "0xcC372d7ae02b89852B129d951b1609Bccf7Fd0a2";

  console.log("========================================");
  console.log("Checking Actual Deployed Contract");
  console.log("========================================");
  console.log("Proxy Address:", PROXY_ADDRESS);

  try {
    // Get implementation address from storage
    const implementationAddress = await upgrades.erc1967.getImplementationAddress(PROXY_ADDRESS);
    console.log("✅ Implementation Address:", implementationAddress);

    // Get admin address
    const adminAddress = await upgrades.erc1967.getAdminAddress(PROXY_ADDRESS);
    console.log("✅ Admin Address:", adminAddress);

    // Check if addresses have code
    const proxyCode = await ethers.provider.getCode(PROXY_ADDRESS);
    const implCode = await ethers.provider.getCode(implementationAddress);

    console.log("\nCode Status:");
    console.log("- Proxy has code:", proxyCode.length > 2 ? "✅ Yes" : "❌ No");
    console.log("- Implementation has code:", implCode.length > 2 ? "✅ Yes" : "❌ No");

    // Try to call a function to verify it works
    const contract = await ethers.getContractAt("NilaStakingUpgradeable", PROXY_ADDRESS);
    const totalStaked = await contract.totalStaked();
    console.log("\nContract is callable:");
    console.log("- Total Staked:", ethers.formatEther(totalStaked), "NILA");

    console.log("\n========================================");
    console.log("Summary:");
    console.log("========================================");
    console.log("Proxy:", PROXY_ADDRESS);
    console.log("Implementation:", implementationAddress);
    console.log("Admin:", adminAddress);

  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
