import { ethers } from 'hardhat';

async function main() {
  console.log('Getting NILA token address from current contract...');

  const contractAddress = process.env.CONTRACT_ADDRESS;
  
  if (!contractAddress) {
    throw new Error('CONTRACT_ADDRESS not set in environment');
  }

  console.log('Current Contract Address:', contractAddress);

  // Get contract instance
  const NilaStaking = await ethers.getContractFactory('NilaStaking');
  const contract = NilaStaking.attach(contractAddress);

  try {
    // Try to get the NILA token address
    const nilaAddress = await contract.nila();
    console.log('\n✅ NILA Token Address:', nilaAddress);
    console.log('\nAdd this to your .env file:');
    console.log(`NILA_TOKEN_ADDRESS=${nilaAddress}`);
  } catch (error: any) {
    console.error('Error getting NILA address:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
