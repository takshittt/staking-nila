import { ethers } from "hardhat";

async function main() {
  const STAKING_CONTRACT_ADDRESS = process.env.STAKING_CONTRACT_ADDRESS || process.env.CONTRACT_ADDRESS || "0xb6BFE033da936DaE74b35C98df00992675f47a3C";
  
  // Get user address from command line or use default
  const userAddress = process.argv[2] || process.env.USER_ADDRESS;
  
  if (!userAddress) {
    console.log("Usage: npx hardhat run scripts/debugUserRewards.ts --network <network> <userAddress>");
    console.log("Or set USER_ADDRESS environment variable");
    process.exit(1);
  }

  console.log("Debugging Rewards for User:", userAddress);
  console.log("Contract:", STAKING_CONTRACT_ADDRESS);
  console.log("=".repeat(80));

  const NilaStaking = await ethers.getContractAt("NilaStakingUpgradeable", STAKING_CONTRACT_ADDRESS);

  // Get claimable rewards from contract
  const claimableRewards = await NilaStaking.getClaimableRewards(userAddress);
  
  console.log("\n📊 Claimable Rewards (from contract):");
  console.log("-".repeat(80));
  console.log(`Instant Rewards: ${ethers.formatUnits(claimableRewards.instantRewards, 18)} NILA`);
  console.log(`Referral Rewards: ${ethers.formatUnits(claimableRewards.referralRewards, 18)} NILA`);
  console.log(`Total Claimable: ${ethers.formatUnits(claimableRewards.totalClaimable, 18)} NILA`);

  // Get user stakes
  const stakeCount = await NilaStaking.getUserStakeCount(userAddress);
  console.log(`\n📝 User Stakes: ${stakeCount}`);
  console.log("-".repeat(80));

  if (stakeCount === 0n) {
    console.log("No stakes found for this user.");
    return;
  }

  const stakes = await NilaStaking.getUserStakes(userAddress);
  
  for (let i = 0; i < stakes.length; i++) {
    const stake = stakes[i];
    const details = await NilaStaking.getStakeDetails(userAddress, i);
    
    console.log(`\nStake #${i}:`);
    console.log(`  Amount: ${ethers.formatUnits(stake.amount, 18)} NILA`);
    console.log(`  Instant Reward Snapshot: ${ethers.formatUnits(stake.instantRewardSnapshot, 18)} NILA`);
    console.log(`  APR: ${(Number(stake.aprSnapshot) / 100).toFixed(2)}%`);
    console.log(`  Start Time: ${new Date(Number(stake.startTime) * 1000).toLocaleString()}`);
    console.log(`  Unlock Time: ${new Date(Number(stake.unlockTime) * 1000).toLocaleString()}`);
    console.log(`  Unstaked: ${stake.unstaked ? 'Yes' : 'No'}`);
    console.log(`  Pending APY Rewards: ${ethers.formatUnits(details.pendingRewards, 18)} NILA`);
    console.log(`  Can Claim: ${details.canClaim ? 'Yes' : 'No'}`);
    console.log(`  Can Unstake: ${details.canUnstake ? 'Yes' : 'No'}`);
  }

  // Get user totals
  const totals = await NilaStaking.getUserTotals(userAddress);
  console.log("\n📈 User Totals:");
  console.log("-".repeat(80));
  console.log(`Total Locked: ${ethers.formatUnits(totals.totalLocked, 18)} NILA`);
  console.log(`Total Pending APY Rewards: ${ethers.formatUnits(totals.totalPendingRewards, 18)} NILA`);
  console.log(`Total Instant Rewards Received: ${ethers.formatUnits(totals.totalInstantRewardsReceived, 18)} NILA`);

  // Check referral info
  const referralStats = await NilaStaking.getReferralStats(userAddress);
  console.log("\n👥 Referral Stats:");
  console.log("-".repeat(80));
  console.log(`Referrer: ${referralStats.referrer === ethers.ZeroAddress ? 'None' : referralStats.referrer}`);
  console.log(`Referrals Made: ${referralStats.referralsMade}`);
  console.log(`Total Referral Earnings: ${ethers.formatUnits(referralStats.totalEarnings, 18)} NILA`);

  console.log("\n" + "=".repeat(80));

  // Diagnosis
  console.log("\n🔍 Diagnosis:");
  console.log("-".repeat(80));
  
  if (claimableRewards.instantRewards === 0n && stakeCount > 0n) {
    let hasInstantRewardStakes = false;
    for (let i = 0; i < stakes.length; i++) {
      if (stakes[i].instantRewardSnapshot > 0n) {
        hasInstantRewardStakes = true;
        break;
      }
    }

    if (hasInstantRewardStakes) {
      console.log("⚠️  Stakes have instant reward snapshots, but claimable amount is 0.");
      console.log("This means the instant rewards were already claimed.");
    } else {
      console.log("❌ No instant rewards found in any stakes.");
      console.log("Possible reasons:");
      console.log("  1. Stakes were created via direct stake() function (no instant rewards)");
      console.log("  2. Stakes were created before reward tiers were configured");
      console.log("  3. Stake amounts don't match any reward tier");
      console.log("\nTo get instant rewards, use the Buy & Stake flow (buyWithToken function).");
    }
  } else if (claimableRewards.instantRewards > 0n) {
    console.log("✅ User has claimable instant rewards!");
    console.log(`   Amount: ${ethers.formatUnits(claimableRewards.instantRewards, 18)} NILA`);
    console.log("   User can claim these rewards now.");
  } else {
    console.log("ℹ️  User has no stakes yet.");
  }

  console.log("\n" + "=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
