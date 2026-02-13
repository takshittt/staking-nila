import { ethers } from 'hardhat';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
  const WALLET_ADDRESS = '0x14FD7e9fa77258B5BBfC9026d95C3D7C693353de';

  if (!CONTRACT_ADDRESS) {
    throw new Error('CONTRACT_ADDRESS not set');
  }

  const NilaStaking = await ethers.getContractFactory('NilaStaking');
  const contract = NilaStaking.attach(CONTRACT_ADDRESS);

  console.log('Checking claimable rewards for:', WALLET_ADDRESS);
  console.log('Contract:', CONTRACT_ADDRESS);
  console.log('');

  try {
    const rewards = await contract.getClaimableRewards(WALLET_ADDRESS);
    console.log('Instant Rewards:', ethers.formatUnits(rewards.instantRewards, 18), 'NILA');
    console.log('Referral Rewards:', ethers.formatUnits(rewards.referralRewards, 18), 'NILA');
    console.log('Total Claimable:', ethers.formatUnits(rewards.totalClaimable, 18), 'NILA');
  } catch (error) {
    console.error('Error:', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
