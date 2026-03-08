import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

import { ethers } from "ethers";
import { TronWeb } from "tronweb";
import axios from "axios";

import prisma from "./prisma-client.js";
import getStakingConfig from "./stakingContract.js";
import getNilaTokenConfig from "./nilaToken.js";
import getEthChainlinkConfig from "./ethChainlink.js";
import getBscChainlinkConfig from "./bscChainlink.js";
import getTronChainlinkConfig from "./tronChainlink.js";

// Initialize config objects after dotenv is loaded
const stakingContract = getStakingConfig();
const nilaToken = getNilaTokenConfig();
const ethChainlink = getEthChainlinkConfig();
const bscChainlink = getBscChainlinkConfig();
const tronChainlink = getTronChainlinkConfig();

const ERC20_RECIPIENT = process.env.ERC20_RECIPIENT;
const TRON_RECIPIENT = process.env.TRON_RECIPIENT;
const BSC_RPC = process.env.BSC_RPC;
const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY;

const TOKEN_DECIMALS = 6;
const AMOUNT_TOLERANCE = 0.01;


// ─── App Setup ────────────────────────────────────────────────────────────────

const app = express();

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true
}));

app.use(bodyParser.json());

// Test database connection on startup
prisma.$connect()
  .then(() => console.log('✅ Connected to MongoDB via Prisma'))
  .catch((err) => console.error('❌ Database connection error:', err));

// ─── Providers ────────────────────────────────────────────────────────────────

const ethProvider = new ethers.JsonRpcProvider(process.env.ETH_RPC);
const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC);


const tronWeb = new TronWeb({
  fullHost: process.env.TRON_RPC
});
tronWeb.setAddress("T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb");
// ─── Claim Contract (BSC) ─────────────────────────────────────────────────────

const provider = new ethers.JsonRpcProvider(BSC_RPC);
const ownerWallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);

// ─── Staking Contract (BSC) ─────────────────────────────────────

const stakingContractObj = new ethers.Contract(
  stakingContract.stakingAddress,
  stakingContract.stakingAbi,
  ownerWallet
);

// ─── NILA Token Contract (BSC) ─────────────────────────────────

const nilaTokenContract = new ethers.Contract(
  nilaToken.nilaAddress,
  nilaToken.nilaAbi,
  ownerWallet
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function evmToTronAddress(evmAddr) {
  if (!evmAddr?.startsWith("0x")) return null;
  return tronWeb.address.fromHex("41" + evmAddr.slice(2));
}


async function adminStakeForUser(userAddress, tokenAmount, lockDays, apr, referrerAddress = null) {
  try {
    // Step 1: Check NILA balance in backend wallet
    const nilaBalance = await nilaTokenContract.balanceOf(ownerWallet.address);
    const nilaBalanceFormatted = ethers.formatUnits(nilaBalance, 18);

    const requiredAmount = ethers.parseUnits(tokenAmount.toString(), 18);
    
    if (nilaBalance < requiredAmount) {
      throw new Error(`Insufficient NILA balance. Required: ${tokenAmount}, Available: ${nilaBalanceFormatted}`);
    }

    // Step 2: Transfer NILA from backend wallet to staking contract
    const transferTx = await nilaTokenContract.transfer(
      stakingContract.stakingAddress,
      requiredAmount
    );
    
    const transferReceipt = await transferTx.wait();

    // Step 3: Call buyWithToken to create stake with rewards
    const referrer = referrerAddress || ethers.ZeroAddress;
    
    const stakeTx = await stakingContractObj.buyWithToken(
      userAddress,
      requiredAmount,
      lockDays,
      apr,
      referrer
    );

    const stakeReceipt = await stakeTx.wait();

    return stakeReceipt.hash;

  } catch (error) {
    throw error;
  }
}

async function getLatestPrice() {
  const response = await axios.get(
    "https://api.lbkex.com/v2/ticker/24hr.do?symbol=nila_usdt"
  );
  if (response.data?.data?.[0]?.ticker?.latest) {
    return Number(response.data.data[0].ticker.latest);
  }
  throw new Error("Failed to fetch price");
}

// async function getNativePrices() {
//   const response = await axios.get(
//     "https://api.coingecko.com/api/v3/simple/price",
//     { params: { ids: "ethereum,binancecoin,tron", vs_currencies: "usd" } }
//   );
//   const data = response.data;
//   return {
//     eth: data.ethereum?.usd || null,
//     bnb: data.binancecoin?.usd || null,
//     trx: data.tron?.usd || null,
//   };
// }
async function getNativePrices() {
  try {
    // ── Ethereum ETH/USD ────────────────────────────────────────
    const ethContract = new ethers.Contract(
      ethChainlink.address,
      ethChainlink.abi,
      ethProvider
    );

    const ethRound = await ethContract.latestRoundData();
    const ethDecimals = await ethContract.decimals();
    const ethPrice = Number(ethRound.answer) / 10 ** Number(ethDecimals);

    // ── BNB Chain BNB/USD ───────────────────────────────────────
    const bnbContract = new ethers.Contract(
      bscChainlink.address,
      bscChainlink.abi,
      bscProvider
    );

    const bnbRound = await bnbContract.latestRoundData();
    const bnbDecimals = await bnbContract.decimals();
    const bnbPrice = Number(bnbRound.answer) / 10 ** Number(bnbDecimals);

    // ── Tron TRX/USD ─────────────────────────────────────────────
    const trxContract = await tronWeb.contract().at(tronChainlink.address);
    const trxRound = await trxContract.latestRoundData().call();
    const trxDecimals = await trxContract.decimals().call();

    // Safe answer extraction
    let trxAnswerStr;
    if (trxRound.answer !== undefined && trxRound.answer !== null) {
      trxAnswerStr = trxRound.answer.toString ? trxRound.answer.toString() : String(trxRound.answer);
    } else if (trxRound[1] !== undefined && trxRound[1] !== null) {
      trxAnswerStr = trxRound[1].toString ? trxRound[1].toString() : String(trxRound[1]);
    } else {
      throw new Error("Unexpected format from TRX/USD latestRoundData");
    }

    const trxPrice = Number(trxAnswerStr) / 10 ** Number(trxDecimals);

    const result = { eth: ethPrice, bnb: bnbPrice, trx: trxPrice };
    return result;

  } catch (err) {
    throw err;
  }
}

// console.log(getNativePrices());
// ─── Price Routes ─────────────────────────────────────────────────────────────

app.get("/api/latest-price", async (req, res) => {
  try {
    const price = await getLatestPrice();
    return res.json({ price });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch price" });
  }
});



app.get("/api/crypto-prices", async (req, res) => {
  try {
    const prices = await getNativePrices();

    return res.json({
      ethereum: prices?.eth || null,
      tron: prices?.trx || null,
    });

  } catch (err) {
    return res.status(500).json({
      error: "Failed to fetch crypto prices",
    });
  }
});

// ─── Real-time Prices Endpoint ────────────────────────────────────────────────
app.get("/api/prices", async (req, res) => {
  try {
    const [nilaPrice, nativePrices] = await Promise.all([
      getLatestPrice(),
      getNativePrices()
    ]);

    if (!nilaPrice) {
      return res.status(500).json({
        error: "NILA price not available. Please try again later."
      });
    }

    return res.json({
      BNB: nativePrices?.bnb || null,
      ETH: nativePrices?.eth || null,
      TRX: nativePrices?.trx || null,
      NILA: nilaPrice,
      timestamp: Date.now()
    });

  } catch (err) {
    return res.status(500).json({
      error: "Failed to fetch prices. Please try again later."
    });
  }
});

// ─── Create Order ─────────────────────────────────────────────────────────────

app.post("/create-order", async (req, res) => {
  const { wallet, pyrandAmount, network, trcWallet, lockDays, apr } = req.body;

  if (!wallet || !pyrandAmount || !network) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const SUPPORTED_NETWORKS = [
    "ETH", "ETH_USDT", "ETH_USDC",
    "BSC", "BSC_USDT", "BSC_USDC",
    "TRC20", "TRX",
  ];

  if (!SUPPORTED_NETWORKS.includes(network)) {
    return res.status(400).json({ error: "Unsupported network" });
  }

  if (network === "TRC20" && !trcWallet) {
    return res.status(400).json({ error: "Missing required fields: trcWallet" });
  }

  const livePrice = await getLatestPrice();
  const pyrand = Number(pyrandAmount);
  if (isNaN(pyrand) || pyrand <= 0) {
    return res.status(400).json({ error: "Invalid pyrandAmount" });
  }

  // Validate lockDays and apr
  const validLockDays = lockDays && Number(lockDays) > 0 ? Number(lockDays) : 30;
  const validApr = apr && Number(apr) >= 0 ? Number(apr) : 1200;

  const orderId = "ORD_" + Date.now();

  const isETH = network.startsWith("ETH");
  const isBSC = network.startsWith("BSC");
  const isTRON = ["TRC20", "TRX"].includes(network);

  const recipient = isETH || isBSC ? ERC20_RECIPIENT : TRON_RECIPIENT;

  let stableAmount = null;
  let cryptoAmount = null;
  let cryptoRate = null;

  if (["ETH_USDT", "ETH_USDC", "BSC_USDT", "BSC_USDC", "TRC20"].includes(network)) {
    stableAmount = Number((pyrand * livePrice).toFixed(6));
  }

  if (["ETH", "BSC", "TRX"].includes(network)) {
    const RATE = await getNativePrices();
    const rateKey = network === "ETH" ? "eth" : network === "BSC" ? "bnb" : "trx";
    cryptoRate = RATE[rateKey];
    cryptoAmount = Number(((pyrand * livePrice) / cryptoRate).toFixed(6));
  }

  const order = await prisma.order.create({
    data: {
      orderId,
      userWallet: wallet.toLowerCase(),
      network,
      trcWallet: isTRON
        ? (trcWallet?.toLowerCase() || wallet.toLowerCase())
        : undefined,
      pyrandAmount: pyrand,
      stableAmount,
      cryptoAmount,
      priceAtCreation: livePrice,
      lockDays: validLockDays,
      apr: validApr,
      status: "PENDING_PAYMENT",
    }
  });

  return res.json({ orderId, network, recipient, stableAmount, cryptoAmount });
});

// ─── Get Order ────────────────────────────────────────────────────────────────

app.get("/order/:orderId", async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { orderId: req.params.orderId }
  });
  
  if (!order) return res.status(404).json({ error: "Not found" });

  const recipient = ["TRC20", "TRX"].includes(order.network)
    ? TRON_RECIPIENT
    : ERC20_RECIPIENT;

  res.json({
    orderId: order.orderId,
    recipient,
    network: order.network,
    pyrandAmount: order.pyrandAmount,
    stableAmount: order.stableAmount,
    cryptoAmount: order.cryptoAmount,
    status: order.status,
    createdAt: order.createdAt,
  });
});


app.post("/verify-transaction", async (req, res) => {
  const { orderId, txHash, network } = req.body;

  console.log("\n🚀 ===== NEW VERIFICATION REQUEST =====");
  console.log("📋 Order ID:", orderId);
  console.log("🔗 TX Hash:", txHash);
  console.log("🌐 Network:", network);
  console.log("⏰ Time:", new Date().toISOString());

  if (!orderId || !txHash || !network) {
    console.log("❌ Missing required fields");
    return res.status(400).json({ error: "Missing required fields: orderId, txHash, network" });
  }

  // ── 1. Load order ──────────────────────────────────────────────────────────
  console.log("\n📦 Loading order...");
  const order = await prisma.order.findUnique({
    where: { orderId }
  });
  
  if (!order) {
    console.log("❌ Order not found");
    return res.status(404).json({ error: "Order not found" });
  }
  
  console.log("✅ Order found:");
  console.log("   User Wallet:", order.userWallet);
  console.log("   Network:", order.network);
  console.log("   NILA Amount:", order.pyrandAmount);
  console.log("   Stable Amount:", order.stableAmount);
  console.log("   Status:", order.status);
  
  if (order.status === "PAID") {
    console.log("⚠️  Order already paid");
    return res.status(400).json({ error: "Order already paid" });
  }

  // ── 2. Idempotency guard ───────────────────────────────────────────────────
  console.log("\n🔒 Checking idempotency...");
  const alreadyProcessed = await prisma.processedTx.findUnique({
    where: { txHash }
  });
  
  if (alreadyProcessed) {
    console.log("⚠️  Transaction already processed");
    return res.status(400).json({ error: "Transaction already processed" });
  }
  console.log("✅ Transaction not processed before");

  try {
    // Use Prisma transaction with extended timeout for blockchain operations
    // Default is 5s, but blockchain verification + staking can take 10-15s
    const result = await prisma.$transaction(async (tx) => {
      // Lock the txHash row immediately
      console.log("\n🔐 Locking transaction hash...");
      await tx.processedTx.create({
        data: { txHash }
      });
      console.log("✅ Transaction hash locked");

    let pyrandToSend = 0;

    // ── 3. Verify on-chain ─────────────────────────────────────────────────
    console.log("\n🔍 Starting on-chain verification...");

    if (network === "TRC20") {
      pyrandToSend = await verifyTRC20(txHash, order);
    } else if (network === "TRX") {
      pyrandToSend = await verifyTRX(txHash, order);
    } else if (["ETH_USDT", "ETH_USDC"].includes(network)) {
      pyrandToSend = await verifyERC20Stable(txHash, order, ethProvider, network);
    } else if (["BSC_USDT", "BSC_USDC"].includes(network)) {
      pyrandToSend = await verifyERC20Stable(txHash, order, bscProvider, network);
    } else if (network === "ETH") {
      pyrandToSend = await verifyNativeETH(txHash, order, ethProvider);
    } else if (network === "BSC") {
      pyrandToSend = await verifyNativeETH(txHash, order, bscProvider);
    } else {
      throw new Error("Unsupported network: " + network);
    }

    if (!pyrandToSend || pyrandToSend <= 0) {
      throw new Error("Could not calculate valid PYRAND amount from transaction");
    }

    // ── 4. Determine EVM Address for Staking ───────────────────────────────
    // For TRON payments, we need to find the user's EVM address from database
    // For EVM payments, order.userWallet is already the EVM address
    
    let evmAddressForStaking;
    let normalizedAddress;
    
    if (["TRC20", "TRX"].includes(network)) {
      console.log("\n🔍 TRON Payment - Looking up EVM address from database...");
      console.log("   TRON Address:", order.trcWallet);
      
      // For TRON payments, order.userWallet should contain the EVM address
      // that was saved when user first connected their wallet
      evmAddressForStaking = order.userWallet.toLowerCase();
      normalizedAddress = evmAddressForStaking;
      
      console.log("   EVM Address for staking:", evmAddressForStaking);
      
      // Validate it's a proper EVM address
      if (!evmAddressForStaking.startsWith('0x') || evmAddressForStaking.length !== 42) {
        throw new Error(
          "Invalid EVM address for TRON payment. " +
          "User must connect their EVM wallet first before paying with TRON. " +
          "EVM Address: " + evmAddressForStaking
        );
      }
    } else {
      // For EVM payments, use the wallet address directly
      evmAddressForStaking = order.userWallet.toLowerCase();
      normalizedAddress = evmAddressForStaking;
      console.log("\n💎 EVM Payment - Using wallet address:", evmAddressForStaking);
    }
    
    // ── 5. Create/Update User in MongoDB ───────────────────────────────────
      let user = await tx.user.findUnique({
        where: { walletAddress: normalizedAddress }
      });
      
      if (!user) {
        // Generate referral code
        const referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        
        user = await tx.user.create({
          data: {
            walletAddress: normalizedAddress,
            referralCode
          }
        });
        
        console.log("✅ New user created:", normalizedAddress);
      } else {
        console.log("✅ Existing user found:", normalizedAddress);
      }

      // ── 6. Transfer NILA & Create Stake ────────────────────────────────────
      console.log("\n🎯 Creating stake for EVM address:", evmAddressForStaking);
      console.log("📅 Lock Days:", order.lockDays);
      console.log("📈 APR:", order.apr, "bps");
      const stakeTxHash = await adminStakeForUser(evmAddressForStaking, pyrandToSend, order.lockDays, order.apr);

      // ── 7. Record Stake in MongoDB ─────────────────────────────────────────
      // Generate unique stakeId using timestamp + random to avoid race conditions
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 5).toUpperCase();
      const stakeId = `STK-${timestamp}-${random}`;
      
      const lockDays = order.lockDays;
      const apr = order.apr; // Keep in basis points (e.g., 1000 = 10%)
      
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + lockDays);

      await tx.stake.create({
        data: {
          stakeId,
          userId: user.id,
          planName: `${lockDays} Days`,
          planVersion: 1,
          amount: pyrandToSend.toString(),
          apy: apr.toString(),
          startDate,
          endDate,
          status: 'active',
          txHash: stakeTxHash
        }
      });

      // ── 8. Record Payment Transaction ──────────────────────────────────────
      // Determine the payment token/currency
      let paymentToken = 'USDT'; // default
      let paymentAmount = order.stableAmount || order.cryptoAmount || 0;
      
      if (network === 'BSC_USDT' || network === 'ETH_USDT' || network === 'TRC20') {
        paymentToken = 'USDT';
        paymentAmount = order.stableAmount || 0;
      } else if (network === 'BSC_USDC' || network === 'ETH_USDC') {
        paymentToken = 'USDC';
        paymentAmount = order.stableAmount || 0;
      } else if (network === 'BSC') {
        paymentToken = 'BNB';
        paymentAmount = order.cryptoAmount || 0;
      } else if (network === 'ETH') {
        paymentToken = 'ETH';
        paymentAmount = order.cryptoAmount || 0;
      } else if (network === 'TRX') {
        paymentToken = 'TRX';
        paymentAmount = order.cryptoAmount || 0;
      }
      
      await tx.transaction.create({
        data: {
          txHash: txHash,
          walletAddress: normalizedAddress,
          type: 'PAYMENT',
          amount: paymentAmount.toString(),
          status: 'confirmed',
          metadata: {
            network,
            orderId,
            nilaAmount: pyrandToSend,
            paymentToken,
            paymentAmount
          }
        }
      });

      // ── 9. Record Staking Transaction ──────────────────────────────────────
      await tx.transaction.create({
        data: {
          txHash: stakeTxHash,
          walletAddress: normalizedAddress,
          type: 'STAKE',
          amount: pyrandToSend.toString(),
          status: 'confirmed',
          metadata: {
            stakeId,
            lockDays,
            apr
          }
        }
      });

      // ── 10. Update order ────────────────────────────────────────────────────
      await tx.order.update({
        where: { orderId },
        data: {
          status: "PAID",
          txHash: txHash,
          stakeTxHash: stakeTxHash,
          pyrandAmount: pyrandToSend
        }
      });

      return { stakeTxHash, stakeId, pyrandToSend };
    }, {
      maxWait: 20000, // Maximum time to wait to start transaction (20s)
      timeout: 30000,  // Maximum time for transaction to complete (30s)
    });

    console.log("✅ PAYMENT VERIFIED & STAKE CREATED");
    console.log("📊 Network:", network);
    console.log("💰 NILA staked:", result.pyrandToSend);
    console.log("🔗 Payment TX:", txHash);
    console.log("🔗 Stake TX:", result.stakeTxHash);
    console.log("📝 Stake ID:", result.stakeId);

    return res.json({
      success: true,
      pyrandSent: result.pyrandToSend,
      tokenTx: result.stakeTxHash,
      stakeId: result.stakeId
    });

  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: "Transaction already being processed" });
    }

    console.error("❌ verify-transaction error:", err.message);
    console.error(err.stack);
    return res.status(500).json({ error: err.message || "Verification failed" });
  }
});


async function verifyERC20Stable(txHash, order, provider, network) {
  console.log("\n🔍 ===== ERC20 STABLE VERIFICATION START =====");
  console.log("📋 Network:", network);
  console.log("🔗 TX Hash:", txHash);
  console.log("👤 Order Wallet:", order.userWallet);
  console.log("💰 Expected Amount:", order.stableAmount);
  console.log("💵 NILA Price:", order.priceAtCreation);

  // const receipt = await provider.getTransactionReceipt(txHash);
  const receipt = await getEvmConfirmedTx(provider, txHash);
  
  if (!receipt) {
    console.log("❌ Transaction not found on-chain");
    throw new Error("Transaction not found on-chain");
  }
  
  console.log("✅ Transaction found and confirmed");
  console.log("📊 Block Number:", receipt.blockNumber);
  console.log("📝 Logs Count:", receipt.logs.length);
  
  if (receipt.status !== 1) {
    console.log("❌ Transaction failed on-chain (status:", receipt.status, ")");
    throw new Error("Transaction failed on-chain");
  }

  // Determine token contract address and decimals from environment variables
  let tokenAddress, decimals;

  if (network === "ETH_USDC") {
    tokenAddress = process.env.ETH_USDC_ADDRESS?.toLowerCase();
    decimals = 6;
  } else if (network === "ETH_USDT") {
    tokenAddress = process.env.ETH_USDT_ADDRESS?.toLowerCase();
    decimals = 6;
  } else if (network === "BSC_USDT") {
    tokenAddress = process.env.BSC_USDT_ADDRESS?.toLowerCase();
    decimals = 18; // BSC USDT uses 18 decimals
  } else if (network === "BSC_USDC") {
    tokenAddress = process.env.BSC_USDC_ADDRESS?.toLowerCase();
    decimals = 18;
  } else {
    throw new Error("Unknown stablecoin network: " + network);
  }

  if (!tokenAddress) {
    throw new Error(`Token address not configured in .env for ${network}`);
  }

  console.log("🪙 Token Address:", tokenAddress);
  console.log("🔢 Decimals:", decimals);
  console.log("📬 Expected Recipient:", ERC20_RECIPIENT.toLowerCase());

  // ERC20 Transfer topic: Transfer(address,address,uint256)
  const transferTopic = ethers.id("Transfer(address,address,uint256)");
  console.log("🏷️  Transfer Topic:", transferTopic);

  let stableAmountPaid = null;
  let logIndex = 0;

  for (const log of receipt.logs) {
    logIndex++;
    console.log(`\n--- Checking Log #${logIndex} ---`);
    console.log("Log Address:", log.address.toLowerCase());
    console.log("Log Topic[0]:", log.topics[0]);
    
    if (log.address.toLowerCase() !== tokenAddress) {
      console.log("⏭️  Skip: Wrong token address");
      continue;
    }
    
    if (log.topics[0] !== transferTopic) {
      console.log("⏭️  Skip: Not a Transfer event");
      continue;
    }
    
    if (log.topics.length < 3) {
      console.log("⏭️  Skip: Not enough topics");
      continue;
    }

    const from = "0x" + log.topics[1].slice(26);
    const to = "0x" + log.topics[2].slice(26);
    
    console.log("📤 From:", from.toLowerCase());
    console.log("📥 To:", to.toLowerCase());

    //  Verify recipient
    if (to.toLowerCase() !== ERC20_RECIPIENT.toLowerCase()) {
      console.log("⏭️  Skip: Wrong recipient");
      console.log("   Expected:", ERC20_RECIPIENT.toLowerCase());
      console.log("   Got:", to.toLowerCase());
      continue;
    }

    //  Verify sender
    if (from.toLowerCase() !== order.userWallet.toLowerCase()) {
      console.log("❌ ERROR: Transaction sender does not match order wallet");
      console.log("   Expected:", order.userWallet.toLowerCase());
      console.log("   Got:", from.toLowerCase());
      throw new Error("Transaction sender does not match order wallet");
    }

    stableAmountPaid = Number(ethers.formatUnits(log.data, decimals));
    console.log("✅ MATCH FOUND!");
    console.log("💰 Amount Paid:", stableAmountPaid);
    break;
  }

  if (stableAmountPaid === null) {
    console.log("\n❌ No matching token transfer found in transaction logs");
    console.log("Summary:");
    console.log("  - Total logs checked:", logIndex);
    console.log("  - Looking for token:", tokenAddress);
    console.log("  - Looking for recipient:", ERC20_RECIPIENT.toLowerCase());
    console.log("  - Looking for sender:", order.userWallet.toLowerCase());
    throw new Error("No matching token transfer found in transaction logs");
  }

  const pyrandToSend = Number((stableAmountPaid / order.priceAtCreation).toFixed(6));
  console.log("\n💎 NILA Calculation:");
  console.log("  Amount Paid:", stableAmountPaid, "USDT");
  console.log("  NILA Price:", order.priceAtCreation);
  console.log("  NILA to Send:", pyrandToSend);
  
  if (pyrandToSend <= 0) {
    console.log("❌ ERROR: Calculated NILA amount is zero");
    throw new Error("Calculated PYRAND amount is zero");
  }

  // Update stableAmount on order with what was actually paid
  order.stableAmount = stableAmountPaid;

  console.log("✅ ===== VERIFICATION SUCCESSFUL =====\n");
  return pyrandToSend;
}

/**
 * Verify a native ETH or BNB transfer.
 * Returns the PYRAND amount to send.
 */


async function verifyNativeETH(txHash, order, provider) {


  // const receipt = await provider.getTransactionReceipt(txHash);
  const receipt = await getEvmConfirmedTx(provider, txHash);
  if (!receipt || receipt.status !== 1) throw new Error("Transaction failed on-chain");

    // const tx = await provider.getTransaction(txHash);
    const tx = await getEvmTransactionWithRetry(provider, txHash);
  if (!tx) throw new Error("Transaction not found on-chain");

  if (tx.to?.toLowerCase() !== ERC20_RECIPIENT.toLowerCase()) {
    throw new Error("Transaction recipient does not match expected recipient");
  }
  // Verify sender wallet matches order wallet
if (!tx.from || tx.from.toLowerCase() !== order.userWallet.toLowerCase()) {
  throw new Error("Transaction sender does not match order wallet");
}

  const nativePaid = Number(ethers.formatEther(tx.value));

  // Recalculate proportionally if amount differs
  let pyrandToSend;
  const tolerance = 1e-9;

  if (Math.abs(nativePaid - order.cryptoAmount) > tolerance && order.cryptoAmount > 0) {
    pyrandToSend = Number(
      ((nativePaid / order.cryptoAmount) * order.pyrandAmount).toFixed(6)
    );
  } else {
    pyrandToSend = order.pyrandAmount;
  }

  if (pyrandToSend <= 0) throw new Error("Calculated PYRAND amount is zero");

  order.cryptoAmount = nativePaid;
  return pyrandToSend;
}


async function getEvmTransactionWithRetry(provider, txHash, retry = 5) {

  for (let i = 0; i < retry; i++) {

    const tx = await provider.getTransaction(txHash);

    if (tx) return tx;

    await new Promise(r => setTimeout(r, 1000));
  }

  return null;
}

async function getEvmConfirmedTx(provider, txHash, retry = 10) {
  console.log(`\n⏳ Waiting for transaction confirmation...`);
  console.log(`🔗 TX Hash: ${txHash}`);
  console.log(`🔄 Max retries: ${retry}`);

  for (let i = 0; i < retry; i++) {
    console.log(`\n🔍 Attempt ${i + 1}/${retry}`);

    try {
      const receipt = await provider.getTransactionReceipt(txHash);

      if (receipt) {
        console.log(`📦 Receipt found!`);
        console.log(`   Block: ${receipt.blockNumber}`);
        console.log(`   Status: ${receipt.status === 1 ? '✅ Success' : '❌ Failed'}`);
        console.log(`   Logs: ${receipt.logs.length}`);
        
        if (receipt.status === 1) {
          console.log(`✅ Transaction confirmed successfully!`);
          return receipt;
        } else {
          console.log(`❌ Transaction failed on-chain`);
        }
      } else {
        console.log(`⏳ Receipt not found yet, waiting...`);
      }

    } catch (err) {
      console.log(`⚠️  RPC query error:`, err.message);
    }

    if (i < retry - 1) {
      console.log(`⏱️  Waiting 1.5 seconds before retry...`);
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  console.log(`\n❌ Transaction not confirmed after ${retry} attempts`);
  return null;
}
async function getConfirmedTronTransaction(txHash, retry = 30) {

  for (let i = 0; i < retry; i++) {

    console.log(`Checking TRON transaction confirmation... Attempt ${i + 1}`);

    try {
      const txInfo = await tronWeb.trx.getTransactionInfo(txHash);

      if (txInfo?.id && txInfo?.receipt?.result === "SUCCESS") {
        return txInfo;
      }

    } catch (err) {
      console.log("RPC query error:", err.message);
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  return null;
}


async function verifyTRC20(txHash, order) {

  console.log("🔍 TRC20 VERIFY START");
  console.log("TX:", txHash);

  // Get confirmed transaction
  const txInfo = await getConfirmedTronTransaction(txHash);

  if (!txInfo) {
    throw new Error("Transaction not confirmed on TRON network");
  }

  console.log("📦 Raw TX Info:");
  console.log(JSON.stringify(txInfo, null, 2));

  if (txInfo.receipt?.result !== "SUCCESS") {
    throw new Error("TRC20 transaction failed on-chain");
  }

  // Transfer event hash
  const transferEventHash = tronWeb
    .sha3("Transfer(address,address,uint256)")
    .slice(2);

  console.log("Transfer event hash:", transferEventHash);

  let stableAmountPaid = null;

  const logs = txInfo.log || [];

  console.log("Number of logs found:", logs.length);

  // ===============================
  // Normalize contract address
  // ===============================
  const tronUsdtAddress = process.env.TRON_USDT_ADDRESS;
  
  if (!tronUsdtAddress) {
    throw new Error("TRON_USDT_ADDRESS not configured in .env");
  }
  
  let contractAddrHex = tronWeb.address
    .toHex(tronUsdtAddress)
    .toLowerCase();

  if (contractAddrHex.startsWith("41")) {
    contractAddrHex = contractAddrHex.slice(2);
  }

  console.log("Expected contract hex:", contractAddrHex);

  // ===============================
  // Log scanning
  // ===============================
  for (const log of logs) {

    console.log("---- Log Debug ----");
    console.log("Log contract:", log.address);
    console.log("Topics:", log.topics);
    console.log("Data:", log.data);

    if (!log.topics || log.topics[0] !== transferEventHash) {
      continue;
    }

    // Contract check
    if (!log.address ||
        log.address.toLowerCase() !== contractAddrHex) {
      continue;
    }

    // Decode recipient
    const toHex = "0x" + log.topics[2].slice(24);
    const toAddr = evmToTronAddress(toHex);

    console.log("Decoded recipient:", toAddr);

    if (!toAddr ||
        toAddr.toLowerCase() !== TRON_RECIPIENT.toLowerCase()) {
      continue;
    }

    // Decode amount (USDT/TRC20 6 decimals)
    const value = BigInt("0x" + log.data);

    stableAmountPaid = Number(Number(value) / 1e6);

    console.log(" Matched transfer!");
    console.log("Paid stable:", stableAmountPaid);

    break;
  }

  if (stableAmountPaid === null) {
    throw new Error("No matching TRC20 transfer found in transaction logs");
  }

  // Amount tolerance check
  const diff = Math.abs(stableAmountPaid - order.stableAmount);

  console.log("Expected stable:", order.stableAmount);
  console.log("Paid stable:", stableAmountPaid);
  console.log("Diff:", diff);

  if (diff > AMOUNT_TOLERANCE) {
    throw new Error(
      `Amount mismatch: expected ${order.stableAmount}, got ${stableAmountPaid}`
    );
  }

  const pyrandToSend = order.pyrandAmount;

  order.stableAmount = stableAmountPaid;

  console.log(" Final PYRAND to send:", pyrandToSend);

  return pyrandToSend;
}

async function verifyTRX(txHash, order) {
  const txInfo = await tronWeb.trx.getTransaction(txHash);
  if (!txInfo || !txInfo.txID) throw new Error("TRX transaction not found on-chain");

  const contract = txInfo.raw_data?.contract?.[0];
  if (!contract || contract.type !== "TransferContract") {
    throw new Error("Transaction is not a TRX transfer");
  }

  const value = contract.parameter.value;
  const toAddr = tronWeb.address.fromHex(value.to_address);
  const fromAddr = tronWeb.address.fromHex(value.owner_address);
  const trxAmount = value.amount / 1e6;

  if (toAddr.toLowerCase() !== TRON_RECIPIENT.toLowerCase()) {
    throw new Error("TRX transaction recipient mismatch");
  }

  if (fromAddr.toLowerCase() !== order.trcWallet.toLowerCase()) {
    throw new Error("TRX transaction sender mismatch");
  }

  // Recalculate PYRAND proportionally
  const TRX_RATE = order.cryptoAmount / order.pyrandAmount;
  const pyrandToSend = Number((trxAmount / TRX_RATE).toFixed(6));
  if (pyrandToSend <= 0) throw new Error("Recalculated PYRAND is zero");

  order.cryptoAmount = trxAmount;
  return pyrandToSend;
}

// ─── Start Server ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;

app.listen(PORT, HOST, () => {
  console.log(`✅ Server running on ${SERVER_URL}`);
  console.log(`📡 Listening on ${HOST}:${PORT}`);
  console.log("Transaction verification endpoint: POST /verify-transaction");
  
  // Verify environment variables are loaded
  console.log("\n🔍 Environment Variables Check:");
  console.log("  ERC20_RECIPIENT:", ERC20_RECIPIENT ? "✅ Set" : "❌ Missing");
  console.log("  TRON_RECIPIENT:", TRON_RECIPIENT ? "✅ Set" : "❌ Missing");
  console.log("  BSC_USDT_ADDRESS:", process.env.BSC_USDT_ADDRESS ? "✅ Set" : "❌ Missing");
  console.log("  BSC_USDC_ADDRESS:", process.env.BSC_USDC_ADDRESS ? "✅ Set" : "❌ Missing");
  console.log("  ETH_USDT_ADDRESS:", process.env.ETH_USDT_ADDRESS ? "✅ Set" : "❌ Missing");
  console.log("  ETH_USDC_ADDRESS:", process.env.ETH_USDC_ADDRESS ? "✅ Set" : "❌ Missing");
  console.log("  TRON_USDT_ADDRESS:", process.env.TRON_USDT_ADDRESS ? "✅ Set" : "❌ Missing");
  console.log("  STAKING_CONTRACT_ADDRESS:", process.env.STAKING_CONTRACT_ADDRESS ? "✅ Set" : "❌ Missing");
  console.log("  NILA_TOKEN_ADDRESS:", process.env.NILA_TOKEN_ADDRESS ? "✅ Set" : "❌ Missing");
  console.log("");
});
