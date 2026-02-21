import { ethers, upgrades, run } from "hardhat";

async function main() {
  const PROXY_ADDRESS = process.env.CONTRACT_ADDRESS || "";
  const NILA_TOKEN = process.env.NILA_TOKEN_ADDRESS || "";

  if (!PROXY_ADDRESS) {
    console.error("❌ Error: CONTRACT_ADDRESS not provided in .env");
    process.exit(1);
  }

  console.log("========================================");
  console.log("Verifying Proxy and Implementation");
  console.log("========================================");
  console.log("Proxy Address:", PROXY_ADDRESS);

  try {
    // Get implementation address
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
      }
    }

    // Verify proxy contract
    console.log("\n🔍 Verifying Proxy Contract...");
    try {
      await run("verify:verify", {
        address: PROXY_ADDRESS,
        contract: "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy",
        constructorArguments: [implementationAddress, "0x"],
      });
      console.log("✅ Proxy verified successfully!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("✅ Proxy already verified!");
      } else {
        console.error("❌ Proxy verification failed:", error.message);
      }
    }

    console.log("\n========================================");
    console.log("✅ Verification Complete!");
    console.log("========================================");
    console.log("\nView on BSCScan:");
    console.log(`https://testnet.bscscan.com/address/${PROXY_ADDRESS}`);
    console.log(`https://testnet.bscscan.com/address/${implementationAddress}`);

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
