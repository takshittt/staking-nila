require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');

// Contract ABI and bytecode
const CONTRACT_ABI = [
  "constructor()",
  "function recover(tuple(uint256 amount, uint256 nonce, bytes signature) voucher) public view returns (address)",
  "function claimTokens(tuple(uint256 amount, uint256 nonce, bytes signature) voucher) public",
  "function claimTokensOwner(address recipient, uint256 amount) external",
  "function userStatus(address _address) public view returns (bool)",
  "function setSigner(address newSigner) external",
  "function deposit(uint256 amount) external",
  "function withdraw(uint256 amount) external",
  "function token() public view returns (address)",
  "function hasClaimed(address) public view returns (bool)",
  "function owner() public view returns (address)"
];

// Read the contract bytecode from test.sol (you'll need to compile it first)
// For now, we'll use a placeholder - you need to compile the contract
const CONTRACT_BYTECODE = process.env.CONTRACT_BYTECODE || '';

async function deployContract(networkName) {
  try {
    // Get RPC URL based on network
    let rpcUrl;
    switch(networkName.toLowerCase()) {
      case 'bsc':
        rpcUrl = process.env.BSC_RPC;
        break;
      case 'eth':
        rpcUrl = process.env.ETH_RPC;
        break;
      case 'nila':
        rpcUrl = process.env.NILA_RPC;
        break;
      default:
        throw new Error(`Unknown network: ${networkName}`);
    }

    if (!rpcUrl) {
      throw new Error(`RPC URL not found for network: ${networkName}`);
    }

    const privateKey = process.env.OWNER_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('OWNER_PRIVATE_KEY not found in .env');
    }

    // Create provider and signer
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`\n🚀 Deploying NILAClaimContract to ${networkName}...`);
    console.log(`📍 Deployer address: ${signer.address}`);

    // Check balance
    const balance = await provider.getBalance(signer.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH\n`);

    if (balance === 0n) {
      throw new Error('Insufficient balance to deploy contract');
    }

    // Create contract factory
    const contractFactory = new ethers.ContractFactory(
      CONTRACT_ABI,
      CONTRACT_BYTECODE,
      signer
    );

    // Deploy contract
    const contract = await contractFactory.deploy();
    await contract.waitForDeployment();

    const deployedAddress = await contract.getAddress();
    console.log(`✅ Contract deployed successfully!`);
    console.log(`📝 Contract Address: ${deployedAddress}`);
    console.log(`🔗 Network: ${networkName}`);

    // Save deployment info
    const deploymentInfo = {
      network: networkName,
      contractAddress: deployedAddress,
      deployerAddress: signer.address,
      deploymentTime: new Date().toISOString(),
      transactionHash: contract.deploymentTransaction()?.hash
    };

    const filename = `backend/deployments/${networkName}-deployment.json`;
    fs.mkdirSync('backend/deployments', { recursive: true });
    fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n📄 Deployment info saved to: ${filename}`);

    return deploymentInfo;

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// Get network from command line argument
const network = process.argv[2] || 'bsc';
deployContract(network);
