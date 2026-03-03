import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🚀 Starting NILAClaimContract deployment...\n');

  // Get deployer - ethers is available globally when run through hardhat
  const [deployer] = await ethers.getSigners();
  
  console.log(`📍 Deploying from: ${deployer.address}`);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} BNB\n`);

  if (balance === 0n) {
    throw new Error('❌ Insufficient balance to deploy contract');
  }

  // Deploy using Hardhat
  console.log('⏳ Deploying contract...');
  const NILAClaimContract = await ethers.getContractFactory('NILAClaimContract');
  const contract = await NILAClaimContract.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  const deploymentTx = contract.deploymentTransaction();

  console.log('\n✅ Contract deployed successfully!');
  console.log(`📝 Contract Address: ${contractAddress}`);
  console.log(`🔗 Transaction Hash: ${deploymentTx?.hash}`);

  // Get network info
  const networkInfo = await ethers.provider.getNetwork();
  const networkName = network.name;
  console.log(`🌐 Network: ${networkName} (Chain ID: ${networkInfo.chainId})`);

  // Save deployment info
  const deploymentInfo = {
    network: networkName,
    chainId: networkInfo.chainId.toString(),
    contractAddress,
    deployerAddress: deployer.address,
    deploymentTime: new Date().toISOString(),
    transactionHash: deploymentTx?.hash,
    blockNumber: deploymentTx?.blockNumber,
  };

  const deploymentsDir = './deployments';
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const filename = path.join(deploymentsDir, `${networkName}-deployment.json`);
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n📄 Deployment info saved to: ${filename}`);

  console.log('\n✨ Deployment complete!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error.message);
    console.error(error);
    process.exit(1);
  });
