# Project Setup Guide (Backend + EVM Frontend + Tron Frontend)

This project contains three folders:

-   📦 backend\
-   🌐 evmfrontend\
-   🌐 tronfrontend

  -   📦 backendOld ->  Folder contain the old backend code in which we are transfering tokens directly to users instead of staking .

Please follow the steps carefully to configure and deploy the project
correctly.

------------------------------------------------------------------------

# 📦 1️⃣ Backend Setup

## Step 1: Install Required Software

Download and install:

-   Node.js (LTS Version): https://nodejs.org/
-   MongoDB Community: https://www.mongodb.com/try/download/community\
    OR MongoDB Atlas: https://www.mongodb.com/atlas

------------------------------------------------------------------------

## Step 2: Create .env File

Inside the backend folder, create a `.env` file.

Fill the following variables:

ERC20_RECIPIENT= TRON_RECIPIENT= BSC_RPC= ETH_RPC= NILA_RPC=
OWNER_PRIVATE_KEY= MON_URI= STAKING_CONTRACT_ADDRESS=

### Variable Description

-   ERC20_RECIPIENT → Your ERC20 recipient wallet address\
-   TRON_RECIPIENT → Your Tron wallet address\
-   BSC_RPC → Binance Smart Chain RPC URL\
-   ETH_RPC → Ethereum RPC URL\
-   NILA_RPC → Nila Network RPC URL\
-   OWNER_PRIVATE_KEY → Private key of staking contract owner\
-   MON_URI → MongoDB connection string\
-   STAKING_CONTRACT_ADDRESS → Deployed staking contract address

⚠️ IMPORTANT: - OWNER_PRIVATE_KEY must match staking contract owner. -
Never share private key publicly. - Never upload .env file to GitHub.

------------------------------------------------------------------------

## Step 3: Configure Staking Contract

Open:

backend/stakingContract.js

You must:

1.  Add your staking contract address.
2.  Paste full contract ABI inside stakingAbi array.

Example:

stakingAddress: "0xYourContractAddress",

stakingAbi: // Paste full ABI JSON array here

------------------------------------------------------------------------

## Step 4: Configure Staking Parameters

Open backend server file.

Find:

const LOCK_DAYS = ""; const APR =""; const INSTANT_REWARD_BPS ="";

Replace with your values.

Example:

const LOCK_DAYS = 30;\
const APR = 1200;\
const INSTANT_REWARD_BPS = 500;

BPS Guide: - 1000 = 10% - 1200 = 12% - 500 = 5%

------------------------------------------------------------------------

## Step 5: Install Backend Dependencies

Inside backend folder run:

npm install

------------------------------------------------------------------------

## Step 6: Start Backend

npm start

------------------------------------------------------------------------

## Step 7: Deploy Backend

Deploy to VPS or cloud server (AWS, DigitalOcean, Contabo, Railway,
Render).

After deployment, you will get API URL:

http://your-server-ip:3001

You must use this API URL in both frontends.

------------------------------------------------------------------------

# 🌐 2️⃣ EVM Frontend Setup

Open:

evmfrontend/main.js

------------------------------------------------------------------------

## 1. Add WalletConnect Project ID

Create at: https://cloud.walletconnect.com/

Replace:

const projectId = ''

With:

const projectId = 'YOUR_WALLETCONNECT_PROJECT_ID'

------------------------------------------------------------------------

## 2. Add RPC URLs & Update Metadata

Replace empty RPC URLs with your own.

You can get RPC from:

https://www.infura.io/\
https://www.alchemy.com/\
https://chainlist.org/

Find: 
const bscProvider = new ethers.providers.JsonRpcProvider("") .
const sepoliaProvider = new ethers.providers.JsonRpcProvider(""). 
Replace with your RPC URLs:
const bscProvider = new ethers.providers.JsonRpcProvider("https://your-bsc-rpc-url") .
const sepoliaProvider = new ethers.providers.JsonRpcProvider("https://your-ethereum-rpc-url").
Also update inside wagmiAdapter transports: [mainnet.id]: http("https://your-ethereum-rpc-url"), [bsc.id]: http("https://your-bsc-rpc-url")

Also Update Url in metadata .

Find Metadata and update url with your website link
url: 'your website deployed link',

------------------------------------------------------------------------

## 3. Update API URL

Replace:

const API = "http://129.151.44.44:3001"

With:

const API = "http://your-deployed-api:3001"

------------------------------------------------------------------------

## 4. Update ERC20 Recipient

Replace recipient address with SAME value used in backend `.env`.

Frontend and backend recipient MUST match.

------------------------------------------------------------------------

# 🌐 3️⃣ Tron Frontend Setup

Open:

tronfrontend/src/App.jsx

------------------------------------------------------------------------

## 1. Update Backend API

Replace:

const API_BASE_URL = "http://129.151.44.44:3001"

With your deployed backend API URL.

------------------------------------------------------------------------

## 2. Add WalletConnect Project ID

Create at: https://cloud.walletconnect.com/

Replace:

projectId: ''

With:

projectId: 'YOUR_WALLETCONNECT_PROJECT_ID'

Update metadata fields with your real app details.

 metadata:
 { name: 'NILA Payment Portal', description: 'Purchase NILA tokens with TRX or USDT', url: 'https://your-app-url.com' }
 Replace with your real details: metadata: { name: 'Your App Name', description: 'Your custom app description', url: 'https://yourdomain.com' }


------------------------------------------------------------------------

# 🛠 Final Deployment Steps

For both frontends:

npm install\
npm run build

Deploy generated build/dist folder to your hosting provider.

------------------------------------------------------------------------

# ✅ Final Checklist

✔ Create .env file\
✔ Fill environment variables\
✔ Configure stakingContract.js\
✔ Configure staking parameters\
✔ Deploy backend\
✔ Configure EVM frontend\
✔ Configure Tron frontend\
✔ Build and deploy both frontends

------------------------------------------------------------------------

# 🔐 Security Notes

-   Never commit .env file publicly.
-   Keep OWNER_PRIVATE_KEY secure.
-   Use HTTPS in production.
-   Make sure backend port (3001) is open on server firewall.
