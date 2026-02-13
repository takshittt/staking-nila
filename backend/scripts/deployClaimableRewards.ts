import { ethers } from 'hardhat';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🚀 Deploying NilaStaking with Claimable Rewards...\n');

  const NILA_TOKEN_ADDRESS = process.env.NILA_TOKEN_ADDRESS;
  
  if (!NILA_TOKEN_ADDRESS) {
    throw new Error('NILA_TOKEN_ADDRESS not set in .env');
  }

  console.log('📋 Configuration:');
  console.log(`   NILA Token: ${NILA_TOKEN_ADDRESS}`);
  console.log('');

  // Deploy NilaStaking
  const NilaStaking = await ethers.getContractFactory('NilaStaking');
  const staking = await NilaStaking.deploy(NILA_TOKEN_ADDRESS);
  await staking.waitForDeployment();

  const stakingAddress = await staking.getAddress();
  console.log('✅ NilaStaking deployed to:', stakingAddress);
  console.log('');

  // Add default amount configs
  console.log('⚙️  Adding default amount configurations...');
  
  const amounts = [
    { amount: ethers.parseUnits('1000', 18), instantRewardBps: 500 },   // 1000 NILA, 5% instant
    { amount: ethers.parseUnits('5000', 18), instantRewardBps: 600 },   // 5000 NILA, 6% instant
    { amount: ethers.parseUnits('10000', 18), instantRewardBps: 700 },  // 10000 NILA, 7% instant
  ];

  for (const config of amounts) {
    const tx = await staking.addAmountConfig(config.amount, config.instantRewardBps);
    await tx.wait();
    console.log(`   ✓ Added: ${ethers.formatUnits(config.amount, 18)} NILA with ${config.instantRewardBps / 100}% instant reward`);
  }
  console.log('');

  // Add default lock configs
  console.log('⚙️  Adding default lock configurations...');
  
  const locks = [
    { lockDays: 30, apr: 1000 },   // 30 days, 10% APR
    { lockDays: 90, apr: 1500 },   // 90 days, 15% APR
    { lockDays: 180, apr: 2000 },  // 180 days, 20% APR
    { lockDays: 365, apr: 2500 },  // 365 days, 25% APR
  ];

  for (const config of locks) {
    const tx = await staking.addLockConfig(config.lockDays, config.apr);
    await tx.wait();
    console.log(`   ✓ Added: ${config.lockDays} days with ${config.apr / 100}% APR`);
  }
  console.log('');

  // Set referral config
  console.log('⚙️  Setting referral configuration...');
  const referralTx = await staking.setReferralConfig(
    500,  // 5% for referrer
    200,  // 2% bonus for referred user
    false // not paused
  );
  await referralTx.wait();
  console.log('   ✓ Referral config: 5% referrer, 2% referred bonus');
  console.log('');

  console.log('✨ Deployment complete!');
  console.log('');
  console.log('📝 Update your .env file with:');
  console.log(`CONTRACT_ADDRESS=${stakingAddress}`);
  console.log('');
  console.log('⚠️  IMPORTANT: Fund the contract with NILA tokens for rewards!');
  console.log('   Use the treasury deposit endpoint or transfer directly');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
