import { ethers } from "hardhat";

const STAKING_CONTRACT = "0xb6BFE033da936DaE74b35C98df00992675f47a3C";
const NILA_TOKEN = "0xA31fb7667F80306690F5DF0d9A6ea272aBF97926";

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Account:", signer.address);

  const stakingABI = [
    "function owner() view returns (address)",
    "function getUserStakes(address user) view returns (tuple(uint256,uint256,uint256,uint256,uint256,uint256,bool)[])",
    "function unstake(uint256 index) external",
    "function pause() external",
    "function withdrawExcessRewards(uint256 amount) external",
    "function availableRewards() view returns (uint256)",
  ];

  const tokenABI = [
    "function balanceOf(address account) view returns (uint256)",
  ];

  const staking = new ethers.Contract(STAKING_CONTRACT, stakingABI, signer);
  const nila = new ethers.Contract(NILA_TOKEN, tokenABI, signer);

  console.log("\n========== CLEANUP ==========");

  // Check if we're the owner
  const owner = await staking.owner();
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    console.log("❌ Not the owner, cannot cleanup");
    process.exit(1);
  }

  // Get user stakes
  const stakes = await staking.getUserStakes(signer.address);
  console.log("Found", stakes.length, "stake(s)");

  // Unstake all stakes
  for (let i = 0; i < stakes.length; i++) {
    if (!stakes[i].unstaked) {
      console.log(`\nUnstaking stake ${i}...`);
      try {
        const tx = await staking.unstake(i);
        await tx.wait();
        console.log("✅ Unstaked stake", i);
      } catch (error: any) {
        if (error.reason?.includes("Lock active")) {
          console.log("⚠️  Lock still active for stake", i, "- pausing and emergency unstaking");
          const pauseTx = await staking.pause();
          await pauseTx.wait();
          console.log("✅ Contract paused");

          // Try emergency unstake
          const emergencyABI = ["function emergencyUnstake(uint256 index) external"];
          const stakingEmergency = new ethers.Contract(STAKING_CONTRACT, emergencyABI, signer);
          const emergencyTx = await stakingEmergency.emergencyUnstake(i);
          await emergencyTx.wait();
          console.log("✅ Emergency unstaked stake", i);
        } else {
          console.error("❌ Error unstaking:", error.message);
        }
      }
    }
  }

  // Pause contract if not already paused
  console.log("\nPausing contract...");
  const pauseTx = await staking.pause();
  await pauseTx.wait();
  console.log("✅ Contract paused");

  // Withdraw all excess rewards
  console.log("\nWithdrawing excess rewards...");
  const availableRewards = await staking.availableRewards();
  console.log("Available rewards:", ethers.formatEther(availableRewards), "NILA");

  if (availableRewards > 0n) {
    const withdrawTx = await staking.withdrawExcessRewards(availableRewards);
    await withdrawTx.wait();
    console.log("✅ Withdrawn", ethers.formatEther(availableRewards), "NILA");
  }

  // Check final balance
  const finalBalance = await nila.balanceOf(signer.address);
  console.log("\n✅ Final NILA balance:", ethers.formatEther(finalBalance));

  console.log("\n========== REDEPLOYING CONTRACT ==========");

  // Deploy new contract
  const NilaStakingFactory = await ethers.getContractFactory("NilaStaking");
  const newStaking = await NilaStakingFactory.deploy(NILA_TOKEN);
  await newStaking.waitForDeployment();

  const newAddress = await newStaking.getAddress();
  console.log("✅ New NilaStaking deployed to:", newAddress);
  console.log("\nUpdate your STAKING_CONTRACT address to:", newAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
