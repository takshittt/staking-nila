import { ethers, upgrades } from "hardhat";

async function main() {
  const PROXY_ADDRESS = process.env.PROXY_ADDRESS || "";

  if (!PROXY_ADDRESS) {
    console.error("❌ Error: PROXY_ADDRESS not provided");
    console.log("\nUsage:");
    console.log("  PROXY_ADDRESS=0x... npx hardhat run scripts/verifyProxy.ts --network <network>");
    process.exit(1);
  }

  console.log("========================================");
  console.log("Verifying Proxy Configuration");
  console.log("========================================");
  console.log("Proxy Address:", PROXY_ADDRESS);

  const proxy = await ethers.getContractAt("NilaStakingUpgradeable", PROXY_ADDRESS);

  // Get implementation address
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(PROXY_ADDRESS);
  console.log("\n📍 Implementation Address:", implementationAddress);

  // Get admin address
  const adminAddress = await upgrades.erc1967.getAdminAddress(PROXY_ADDRESS);
  console.log("📍 Admin Address:", adminAddress);

  // Get contract owner
  const owner = await proxy.owner();
  console.log("📍 Contract Owner:", owner);

  // Get version
  try {
    const version = await proxy.version();
    console.log("📍 Contract Version:", version);
  } catch (e) {
    console.log("📍 Contract Version: Not available");
  }

  // Get NILA token address
  const nilaAddress = await proxy.nila();
  console.log("📍 NILA Token:", nilaAddress);

  // Get contract state
  console.log("\n========================================");
  console.log("Contract State");
  console.log("========================================");
  
  const totalStaked = await proxy.totalStaked();
  console.log("Total Staked:", ethers.formatEther(totalStaked), "NILA");

  const uniqueStakers = await proxy.uniqueStakers();
  console.log("Unique Stakers:", uniqueStakers.toString());

  const paused = await proxy.paused();
  console.log("Paused:", paused);

  const nilaToken = await ethers.getContractAt("IERC20", nilaAddress);
  const balance = await nilaToken.balanceOf(PROXY_ADDRESS);
  console.log("Contract Balance:", ethers.formatEther(balance), "NILA");

  const availableRewards = await proxy.availableRewards();
  console.log("Available Rewards:", ethers.formatEther(availableRewards), "NILA");

  // Get configurations
  console.log("\n========================================");
  console.log("Configurations");
  console.log("========================================");

  const amountConfigCount = await proxy.getAmountConfigCount();
  console.log("Amount Configs:", amountConfigCount.toString());

  const lockConfigCount = await proxy.getLockConfigCount();
  console.log("Lock Configs:", lockConfigCount.toString());

  // Get referral config
  const referralConfig = await proxy.getReferralConfig();
  console.log("\nReferral Configuration:");
  console.log("  Referral %:", (Number(referralConfig[0]) / 100).toFixed(2) + "%");
  console.log("  Referrer Bonus %:", (Number(referralConfig[1]) / 100).toFixed(2) + "%");
  console.log("  Paused:", referralConfig[2]);

  console.log("\n✅ Verification complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
