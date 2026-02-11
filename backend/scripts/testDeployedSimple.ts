import { ethers } from "hardhat";

const STAKING_CONTRACT = "0x44821cE93B6A8BBA515041D4DFDF3dDd9082c57c";
const NILA_TOKEN = "0xA31fb7667F80306690F5DF0d9A6ea272aBF97926";

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Testing with account:", signer.address);

  const stakingABI = [
    "function owner() view returns (address)",
    "function totalStaked() view returns (uint256)",
    "function uniqueStakers() view returns (uint256)",
    "function addAmountConfig(uint256 amount, uint256 instantRewardBps) external",
    "function addLockConfig(uint256 lockDays, uint256 apr) external",
    "function pause() external",
    "function unpause() external",
    "function paused() view returns (bool)",
    "function stake(uint256 amountId, uint256 lockId) external",
    "function claim(uint256 index) external",
    "function unstake(uint256 index) external",
    "function emergencyUnstake(uint256 index) external",
    "function pendingReward(address user, uint256 index) view returns (uint256)",
    "function getUserStakes(address user) view returns (tuple(uint256,uint256,uint256,uint256,uint256,uint256,bool)[])",
    "function getUserActiveStakeCount(address user) view returns (uint256)",
    "function availableRewards() view returns (uint256)",
  ];

  const tokenABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function transfer(address to, uint256 amount) external returns (bool)",
  ];

  const staking = new ethers.Contract(STAKING_CONTRACT, stakingABI, signer);
  const nila = new ethers.Contract(NILA_TOKEN, tokenABI, signer);

  console.log("\n========== A. DEPLOYMENT & SETUP ==========");
  try {
    const owner = await staking.owner();
    console.log("✅ Owner:", owner);

    const totalStaked = await staking.totalStaked();
    console.log("✅ Total Staked:", ethers.formatEther(totalStaked), "NILA");

    const uniqueStakers = await staking.uniqueStakers();
    console.log("✅ Unique Stakers:", uniqueStakers.toString());
  } catch (error) {
    console.error("❌ Error:", error);
  }

  console.log("\n========== B. ADMIN ACTIONS ==========");
  try {
    const owner = await staking.owner();
    if (owner.toLowerCase() !== signer.address.toLowerCase()) {
      console.log("⚠️  Not the owner, skipping admin actions");
      return;
    }

    console.log("Adding amount config (100 NILA, 5% instant reward)...");
    const amountTx = await staking.addAmountConfig(
      ethers.parseEther("100"),
      500
    );
    const amountReceipt = await amountTx.wait();
    console.log("✅ Amount config added (tx:", amountReceipt?.hash, ")");

    console.log("Adding lock config (30 days, 10% APR)...");
    const lockTx = await staking.addLockConfig(30, 1000);
    const lockReceipt = await lockTx.wait();
    console.log("✅ Lock config added (tx:", lockReceipt?.hash, ")");

    console.log("Pausing contract...");
    const pauseTx = await staking.pause();
    await pauseTx.wait();
    console.log("✅ Contract paused");

    const isPaused = await staking.paused();
    console.log("✅ Paused status:", isPaused);

    console.log("Unpausing contract...");
    const unpauseTx = await staking.unpause();
    await unpauseTx.wait();
    console.log("✅ Contract unpaused");
  } catch (error) {
    console.error("❌ Error:", error);
  }

  console.log("\n========== C. STAKING FLOW ==========");
  try {
    const balance = await nila.balanceOf(signer.address);
    console.log("Your NILA balance:", ethers.formatEther(balance));

    if (balance < ethers.parseEther("100")) {
      console.log("⚠️  Insufficient NILA balance to stake (need 100)");
      return;
    }

    console.log("\nApproving staking contract...");
    const approveTx = await nila.approve(STAKING_CONTRACT, ethers.MaxUint256);
    await approveTx.wait();
    console.log("✅ Approved");

    console.log("Staking 100 NILA (config 0, lock 0)...");
    const stakeTx = await staking.stake(0, 0);
    const stakeReceipt = await stakeTx.wait();
    console.log("✅ Staked successfully (tx:", stakeReceipt?.hash, ")");

    const activeStakes = await staking.getUserActiveStakeCount(signer.address).catch(() => {
      console.log("⚠️  getUserActiveStakeCount not available on deployed contract");
      return null;
    });
    if (activeStakes !== null) {
      console.log("✅ Active stakes:", activeStakes.toString());
    }

    const totalStaked = await staking.totalStaked();
    console.log("✅ Total staked in contract:", ethers.formatEther(totalStaked), "NILA");
  } catch (error) {
    console.error("❌ Error:", error);
  }

  console.log("\n========== D. REWARDS LOGIC ==========");
  try {
    const stakes = await staking.getUserStakes(signer.address);
    if (stakes.length === 0) {
      console.log("⚠️  No stakes found");
      return;
    }

    console.log("✅ Found", stakes.length, "stake(s)");

    for (let i = 0; i < stakes.length; i++) {
      const stake = stakes[i];
      const pendingReward = await staking.pendingReward(signer.address, i).catch(() => null);
      
      console.log(`\nStake ${i}:`);
      if (stake.amount) console.log("  - Amount:", ethers.formatEther(stake.amount), "NILA");
      if (stake.startTime) console.log("  - Start time:", new Date(Number(stake.startTime) * 1000).toISOString());
      if (stake.lastClaimTime) console.log("  - Last claim:", new Date(Number(stake.lastClaimTime) * 1000).toISOString());
      if (stake.unlockTime) console.log("  - Unlock time:", new Date(Number(stake.unlockTime) * 1000).toISOString());
      if (pendingReward !== null) {
        console.log("  - Pending reward:", ethers.formatEther(pendingReward), "NILA");
      }
      console.log("  - Unstaked:", stake.unstaked);
    }

    const availableRewards = await staking.availableRewards();
    console.log("\n✅ Available rewards in pool:", ethers.formatEther(availableRewards), "NILA");
  } catch (error) {
    console.error("❌ Error:", error);
  }

  console.log("\n========== TEST COMPLETE ==========");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
