import * as fs from "fs";
import * as path from "path";

/**
 * Updates the .env file with new contract addresses
 * Usage: npx tsx scripts/updateEnv.ts <proxyAddress> [implementationAddress]
 */
function updateEnvFile(proxyAddress: string, implementationAddress?: string) {
  const envPath = path.join(__dirname, "..", ".env");
  
  if (!fs.existsSync(envPath)) {
    console.error("❌ .env file not found");
    process.exit(1);
  }

  let envContent = fs.readFileSync(envPath, "utf-8");
  
  // Update CONTRACT_ADDRESS
  if (envContent.includes("CONTRACT_ADDRESS=")) {
    envContent = envContent.replace(
      /CONTRACT_ADDRESS=.*/,
      `CONTRACT_ADDRESS=${proxyAddress}`
    );
    console.log("✅ Updated CONTRACT_ADDRESS to:", proxyAddress);
  } else {
    envContent += `\nCONTRACT_ADDRESS=${proxyAddress}`;
    console.log("✅ Added CONTRACT_ADDRESS:", proxyAddress);
  }

  // Optionally update IMPLEMENTATION_ADDRESS
  if (implementationAddress) {
    if (envContent.includes("IMPLEMENTATION_ADDRESS=")) {
      envContent = envContent.replace(
        /IMPLEMENTATION_ADDRESS=.*/,
        `IMPLEMENTATION_ADDRESS=${implementationAddress}`
      );
      console.log("✅ Updated IMPLEMENTATION_ADDRESS to:", implementationAddress);
    } else {
      envContent += `\nIMPLEMENTATION_ADDRESS=${implementationAddress}`;
      console.log("✅ Added IMPLEMENTATION_ADDRESS:", implementationAddress);
    }
  }

  fs.writeFileSync(envPath, envContent);
  console.log("\n✅ .env file updated successfully");
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("Usage: npx tsx scripts/updateEnv.ts <proxyAddress> [implementationAddress]");
  process.exit(1);
}

updateEnvFile(args[0], args[1]);
