import '@nomicfoundation/hardhat-ethers';
import '@nomicfoundation/hardhat-verify';
import dotenv from 'dotenv';

dotenv.config();

const networks = {};

// Mainnet networks
if (process.env.BSC_RPC) {
  networks.bsc = {
    type: 'http',
    url: process.env.BSC_RPC,
    accounts: process.env.OWNER_PRIVATE_KEY ? [process.env.OWNER_PRIVATE_KEY] : [],
    chainId: 56,
  };
}

if (process.env.ETH_RPC) {
  networks.eth = {
    type: 'http',
    url: process.env.ETH_RPC,
    accounts: process.env.OWNER_PRIVATE_KEY ? [process.env.OWNER_PRIVATE_KEY] : [],
    chainId: 1,
  };
}

if (process.env.NILA_RPC) {
  networks.nila = {
    type: 'http',
    url: process.env.NILA_RPC,
    accounts: process.env.OWNER_PRIVATE_KEY ? [process.env.OWNER_PRIVATE_KEY] : [],
  };
}

// Testnet networks
if (process.env.BSC_TESTNET_RPC) {
  networks.bscTestnet = {
    type: 'http',
    url: process.env.BSC_TESTNET_RPC,
    accounts: process.env.OWNER_PRIVATE_KEY ? [process.env.OWNER_PRIVATE_KEY] : [],
    chainId: 97,
  };
}

if (process.env.ETH_TESTNET_RPC) {
  networks.ethSepolia = {
    type: 'http',
    url: process.env.ETH_TESTNET_RPC,
    accounts: process.env.OWNER_PRIVATE_KEY ? [process.env.OWNER_PRIVATE_KEY] : [],
    chainId: 11155111,
  };
}

export default {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: {
        enabled: false,
        runs: 200,
      },
    },
  },
  networks,
  paths: {
    sources: "./contracts",
    artifacts: "./artifacts",
  },
  defaultNetwork: "hardhat",
  etherscan: {
    apiKey: process.env.BSCSCAN_API_KEY || "",
  },
  sourcify: {
    enabled: false,
  },
};
