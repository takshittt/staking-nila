import { ethers } from 'hardhat';

async function main() {
  console.log('Deploying NilaStaking with Referral System...');

  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);

  // Get NILA token address from environment
  const nilaTokenAddress = process.env.NILA_TOKEN_ADDRESS;
  
  if (!nilaTokenAddress) {
    throw new Error('NILA_TOKEN_ADDRESS not set in environment');
  }

  console.log('NILA Token Address:', nilaTokenAddress);

  // Deploy NilaStaking
  const NilaStaking = await ethers.getContractFactory('NilaStaking');
  const staking = await NilaStaking.deploy(nilaTokenAddress);
  
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();

  console.log('NilaStaking deployed to:', stakingAddress);

  // Get initial referral config
  const config = await staking.getReferralConfig();
  console.log('\nInitial Referral Configuration:');
  console.log('- Referral Percentage:', Number(config.referralPercentageBps) / 100, '%');
  console.log('- Referrer Percentage:', Number(config.referrerPercentageBps) / 100, '%');
  console.log('- Is Paused:', config.isPaused);

  console.log('\n✅ Deployment complete!');
  console.log('\nUpdate your .env file with:');
  console.log(`CONTRACT_ADDRESS=${stakingAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
