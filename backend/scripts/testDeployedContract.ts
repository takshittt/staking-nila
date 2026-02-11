import { ethers } from "hardhat";
import { NilaStaking } from "../typechain-types";

const STAKING_CONTRACT = "0xb6BFE033da936DaE74b35C98df00992675f47a3C";
const NILA_TOKEN = "0xA31fb7667F80306690F5DF0d9A6ea272aBF97926";

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Testing with account:", signer.address);

  // Get contract instances using typechain
  const stakingFactory = await ethers.getContractFactory("NilaStaking");
  const staking = stakingFactory.attach(STAKING_CONTRACT).connect(signer) as NilaStaking;

  const tokenABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function transfer(address to, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
  ];

  const nila = new ethers.Contract(NILA_TOKEN, tokenABI, signer);

  console.log("\n========== A. DEPLOYMENT & SETUP ==========");
  try {
    const owner = await staking.owner();
    console.log("✅ Owner:", owner);

    const totalStaked = await staking.totalStaked();
    console.log("✅ Total Staked:", ethers.formatEther(totalStaked), "NILA");

    const uniqueStakers = await staking.uniqueStakers();
    console.log("✅ Unique Stakers:", uniqueStakers.toString());

    const amountConfigs = await staking.getAmountConfigCount();
    console.log("✅ Amount Configs:", amountConfigs.toString());

    const lockConfigs = await staking.getLockConfigCount();
    console.log("✅ Lock Configs:", lockConfigs.toString());
  } catch (error) {
    console.error("❌ Error in deployment check:", error);
  }

  console.log("\n========== B. ADMIN ACTIONS ==========");
  try {
    // Check if we're the owner
    const owner = await staking.owner();
    if (owner.toLowerCase() !== signer.address.toLowerCase()) {
      console.log("⚠️  Not the owner, skipping admin actions");
      return;
    }

    console.log("Adding amount config...");
    const amountTx = await staking.addAmountConfig(
      ethers.parseEther("100"),
      500 // 5% instant reward
    );
    await amountTx.wait();
    console.log("✅ Amount config added");

    console.log("Adding lock config...");
    const lockTx = await staking.addLockConfig(30, 1000); // 30 days, 10% APR
    await lockTx.wait();
    console.log("✅ Lock config added");

    console.log("Checking pause status...");
    const isPaused = await staking.paused();
    console.log("✅ Contract paused:", isPaused);

    if (!isPaused) {
      console.log("Pausing contract...");
      const pauseTx = await staking.pause();
      await pauseTx.wait();
      console.log("✅ Contract paused");

      console.log("Unpausing contract...");
      const unpauseTx = await staking.unpause();
      await unpauseTx.wait();
      console.log("✅ Contract unpaused");
    }
  } catch (error) {
    console.error("❌ Error in admin actions:", error);
  }

  console.log("\n========== C. STAKING FLOW ==========");
  try {
    const amountConfigs = await staking.getAmountConfigCount();
    const lockConfigs = await staking.getLockConfigCount();

    if (amountConfigs === 0n || lockConfigs === 0n) {
      console.log("⚠️  No configs available, skipping staking test");
      return;
    }

    // Check NILA balance
    const balance = await nila.balanceOf(signer.address);
    console.log("Your NILA balance:", ethers.formatEther(balance));

    if (balance < ethers.parseEther("100")) {
      console.log("⚠️  Insufficient NILA balance to stake");
      return;
    }

    // Approve staking contract
    console.log("Approving staking contract...");
    const approveTx = await nila.approve(
      STAKING_CONTRACT,
      ethers.MaxUint256
    );
    await approveTx.wait();
    console.log("✅ Approved");

    // Stake
    console.log("Staking 100 NILA...");
    const stakeTx = await staking.stake(0, 0);
    await stakeTx.wait();
    console.log("✅ Staked successfully");

    // Check active stakes
    const activeStakes = await staking.getUserActiveStakeCount(signer.address);
    console.log("✅ Active stakes:", activeStakes.toString());

    // Check total staked
    const totalStaked = await staking.totalStaked();
    console.log("✅ Total staked in contract:", ethers.formatEther(totalStaked), "NILA");
  } catch (error) {
    console.error("❌ Error in staking flow:", error);
  }

  console.log("\n========== D. REWARDS LOGIC ==========");
  try {
    const stakes = await staking.getUserStakes(signer.address);
    if (stakes.length === 0) {
      console.log("⚠️  No stakes found");
      return;
    }

    const pendingReward = await staking.pendingReward(signer.address, 0);
    console.log("✅ Pending reward on stake 0:", ethers.formatEther(pendingReward), "NILA");

    const details = await staking.getStakeDetails(signer.address, 0);
    console.log("✅ Stake details:");
    console.log("   - Amount:", ethers.formatEther(details[0]), "NILA");
    console.log("   - Start time:", new Date(Number(details[1]) * 1000).toISOString());
    console.log("   - Last claim:", new Date(Number(details[2]) * 1000).toISOString());
    console.log("   - Unlock time:", new Date(Number(details[3]) * 1000).toISOString());
    console.log("   - APR:", details[4].toString(), "bps");
    console.log("   - Can claim:", details[8]);
    console.log("   - Can unstake:", details[9]);

    const availableRewards = await staking.availableRewards();
    console.log("✅ Available rewards in pool:", ethers.formatEther(availableRewards), "NILA");
  } catch (error) {
    console.error("❌ Error in rewards logic:", error);
  }

  console.log("\n========== E. UNSTAKE & EMERGENCY ==========");
  try {
    const stakes = await staking.getUserStakes(signer.address);
    if (stakes.length === 0) {
      console.log("⚠️  No stakes found");
      return;
    }

    const details = await staking.getStakeDetails(signer.address, 0);
    const canUnstake = details[9];
    const isPaused = await staking.paused();

    if (canUnstake) {
      console.log("✅ Can unstake (lock period expired)");
    } else {
      console.log("⚠️  Cannot unstake yet (lock period active)");
    }

    if (isPaused) {
      console.log("✅ Contract is paused - emergency unstake available");
    } else {
      console.log("⚠️  Contract not paused - emergency unstake not available");
    }
  } catch (error) {
    console.error("❌ Error in unstake check:", error);
  }

  console.log("\n========== TEST COMPLETE ==========");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
