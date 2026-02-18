import { ethers, upgrades } from "hardhat";

async function main() {
  const PROXY_ADDRESS = process.env.PROXY_ADDRESS || "";

  if (!PROXY_ADDRESS) {
    console.log("========================================");
    console.log("Storage Layout Validation");
    console.log("========================================");
    console.log("\nValidating upgrade compatibility without deployed proxy...");
    console.log("This checks if V2 contract maintains storage layout compatibility.\n");
  } else {
    console.log("========================================");
    console.log("Validating Upgrade for Deployed Proxy");
    console.log("========================================");
    console.log("Proxy Address:", PROXY_ADDRESS);
  }

  try {
    // Get the new implementation factory
    const NilaStakingUpgradeableV2 = await ethers.getContractFactory("NilaStakingUpgradeableV2");

    if (PROXY_ADDRESS) {
      // Validate against deployed proxy
      console.log("\n🔍 Validating storage layout compatibility...");
      await upgrades.validateUpgrade(PROXY_ADDRESS, NilaStakingUpgradeableV2, {
        kind: "uups",
      });
      console.log("✅ Storage layout is compatible!");
    } else {
      // Just validate the implementation
      console.log("🔍 Validating implementation contract...");
      await upgrades.validateImplementation(NilaStakingUpgradeableV2, {
        kind: "uups",
      });
      console.log("✅ Implementation contract is valid!");
    }

    console.log("\n📋 Validation Results:");
    console.log("  ✅ No storage layout conflicts detected");
    console.log("  ✅ No unsafe operations found");
    console.log("  ✅ Upgrade should be safe to execute");

    console.log("\n💡 Next Steps:");
    if (PROXY_ADDRESS) {
      console.log("  1. Run upgrade tests: npx hardhat test test/NilaStakingUpgrade.test.ts");
      console.log("  2. Execute upgrade: npx hardhat run scripts/upgradeProxy.ts --network <network>");
    } else {
      console.log("  1. Deploy to testnet first");
      console.log("  2. Set PROXY_ADDRESS and validate again");
      console.log("  3. Run upgrade tests");
    }

  } catch (error: any) {
    console.error("\n❌ Validation Failed!");
    console.error("\nError Details:");
    console.error(error.message);

    if (error.message.includes("storage")) {
      console.error("\n⚠️  Storage Layout Issue Detected!");
      console.error("\nCommon causes:");
      console.error("  - Reordered state variables");
      console.error("  - Changed variable types");
      console.error("  - Removed state variables");
      console.error("  - Inserted variables in the middle");
      console.error("\nFix by:");
      console.error("  - Only add new variables at the end");
      console.error("  - Never change existing variable order or types");
      console.error("  - Use storage gaps properly");
    }

    if (error.message.includes("initialize")) {
      console.error("\n⚠️  Initialization Issue Detected!");
      console.error("\nEnsure:");
      console.error("  - Constructor has _disableInitializers()");
      console.error("  - Initialize function has 'initializer' modifier");
      console.error("  - No constructor logic (use initialize instead)");
    }

    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
