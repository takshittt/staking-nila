import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🔍 Starting contract verification...\n');

  // Get network name from command line or use bscTestnet
  const networkName = network.name;
  
  // Read deployment info
  const deploymentFile = path.join('./deployments', `${networkName}-deployment.json`);
  
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`Deployment file not found: ${deploymentFile}`);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
  const contractAddress = deploymentInfo.contractAddress;

  console.log(`📝 Contract Address: ${contractAddress}`);
  console.log(`🌐 Network: ${networkName}\n`);

  console.log('⏳ Verifying contract on BSCScan...');

  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [],
    });

    console.log('\n✅ Contract verified successfully!');
    console.log(`🔗 View on BSCScan: https://${networkName === 'bscTestnet' ? 'testnet.' : ''}bscscan.com/address/${contractAddress}#code`);
  } catch (error) {
    if (error.message.includes('Already Verified')) {
      console.log('\n✅ Contract is already verified!');
      console.log(`🔗 View on BSCScan: https://${networkName === 'bscTestnet' ? 'testnet.' : ''}bscscan.com/address/${contractAddress}#code`);
    } else {
      throw error;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Verification failed:', error.message);
    console.error(error);
    process.exit(1);
  });
