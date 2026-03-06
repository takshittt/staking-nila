import { ethers, upgrades, run } from "hardhat";

async function main() {
  const PROXY_ADDRESS = process.env.PROXY_ADDRESS || process.env.CONTRACT_ADDRESS || "";

  if (!PROXY_ADDRESS) {
    console.error("❌ Error: PROXY_ADDRESS not provided");
    console.log("\nUsage:");
    console.log("  PROXY_ADDRESS=0x... npx hardhat run scripts/verifyImplementation.ts --network <network>");
    process.exit(1);
  }

  console.log("========================================");
  console.log("Verifying Implementation Contract");
  console.log("========================================");
  console.log("Proxy Address:", PROXY_ADDRESS);

  try {
    // Get implementation address from proxy
    const implementationAddress = await upgrades.erc1967.getImplementationAddress(PROXY_ADDRESS);
    console.log("Implementation Address:", implementationAddress);

    // Verify implementation contract
    console.log("\n🔍 Verifying Implementation Contract...");
    try {
      await run("verify:verify", {
        address: implementationAddress,
        contract: "contracts/NilaStakingUpgradeable.sol:NilaStakingUpgradeable",
        constructorArguments: [],
      });
      console.log("✅ Implementation verified successfully!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("✅ Implementation already verified!");
      } else {
        console.error("❌ Implementation verification failed:", error.message);
        throw error;
      }
    }

    console.log("\n========================================");
    console.log("✅ Verification Complete!");
    console.log("========================================");
    console.log("\nView on BSCScan:");
    console.log(`Proxy: https://bscscan.com/address/${PROXY_ADDRESS}`);
    console.log(`Implementation: https://bscscan.com/address/${implementationAddress}`);

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
