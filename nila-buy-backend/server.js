import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bodyParser from "body-parser";

import { ethers } from "ethers";
import { TronWeb } from "tronweb";
import axios from "axios";

import ethUsdc from "./data.js";
import claimContract from "./claim.js";
import trc20Data from "./data2.js";
import bscUsdt from "./data3.js";
import bscUsdc from "./data4.js";
import ethUsdt from "./data5.js";
import stakingContract from "./stakingContract.js";
import ethChainlink from "./ethChainlink.js";
import bscChainlink from "./bscChainlink.js";
import tronChainlink from "./tronChainlink.js";

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
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(bodyParser.json());

mongoose
  .connect(process.env.MON_URI)
  .then(() => console.log("DB connected"))
  .catch((err) => console.log("Error connecting DB:", err));

// ─── Schemas ──────────────────────────────────────────────────────────────────

const OrderSchema = new mongoose.Schema({
  orderId: String,
  userWallet: String,
  trcWallet: String,
  network: String,
  pyrandAmount: Number,
  stableAmount: Number,
  cryptoAmount: Number,
  priceAtCreation: Number,
  status: String,
  createdAt: { type: Date, default: Date.now },
  txHash: { type: String, unique: true, sparse: true },
});
const Order = mongoose.model("Order", OrderSchema);

const ProcessedTxSchema = new mongoose.Schema({
  txHash: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now },
});
const ProcessedTx = mongoose.model("ProcessedTx", ProcessedTxSchema);

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function evmToTronAddress(evmAddr) {
  if (!evmAddr?.startsWith("0x")) return null;
  return tronWeb.address.fromHex("41" + evmAddr.slice(2));
}


async function adminStakeForUser(userAddress, tokenAmount) {
  console.log("Admin staking for:", userAddress);


  const LOCK_DAYS = 30;            // 🔴 ADD LOCK DAYS (Example: 30)
  const APR = 1200;                 // 🔴 ADD APR IN BPS (Example: 1200 for 12%)
  const INSTANT_REWARD_BPS = 500;   // 🔴 ADD INSTANT REWARD BPS (Example: 500 for 5%)

  const tx = await stakingContractObj.adminCreateStake(
    userAddress,
    ethers.parseUnits(tokenAmount.toString(), 18), 
    LOCK_DAYS,
    APR,
    INSTANT_REWARD_BPS
  );

  console.log("Staking TX sent:", tx.hash);

  const receipt = await tx.wait();

  console.log("Staking confirmed:",receipt.transactionHash || receipt.hash );

  return  receipt.transactionHash || receipt.hash;;
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
    console.log(" [getNativePrices] Starting price fetch...");

    // ── Ethereum ETH/USD ────────────────────────────────────────
    console.log(" [ETH] Connecting to Chainlink ETH/USD feed...");
    console.log(" [ETH] Contract address:", ethChainlink.address);
    console.log("[ETH] Provider:", ethProvider?.connection?.url || ethProvider?._networkName || "unknown");

    const ethContract = new ethers.Contract(
      ethChainlink.address,
      ethChainlink.abi,
      ethProvider
    );
    console.log(" [ETH] Contract instance created");

    const ethRound = await ethContract.latestRoundData();
    console.log(" [ETH] Raw latestRoundData:", {
      roundId: ethRound.roundId?.toString(),
      answer: ethRound.answer?.toString(),
      startedAt: ethRound.startedAt?.toString(),
      updatedAt: ethRound.updatedAt?.toString(),
      answeredInRound: ethRound.answeredInRound?.toString(),
    });

    const ethDecimals = await ethContract.decimals();
    console.log("🔷 [ETH] Decimals:", ethDecimals.toString());

    const ethPrice = Number(ethRound.answer) / 10 ** Number(ethDecimals);
    console.log(" [ETH] Final ETH/USD price:", ethPrice);

    // ── BNB Chain BNB/USD ───────────────────────────────────────
    console.log(" [BNB] Connecting to Chainlink BNB/USD feed...");
    console.log(" [BNB] Contract address:", bscChainlink.address);
    console.log(" [BNB] Provider:", bscProvider?.connection?.url || bscProvider?._networkName || "unknown");

    const bnbContract = new ethers.Contract(
      bscChainlink.address,
      bscChainlink.abi,
      bscProvider
    );
    console.log(" [BNB] Contract instance created");

    const bnbRound = await bnbContract.latestRoundData();
    console.log(" [BNB] Raw latestRoundData:", {
      roundId: bnbRound.roundId?.toString(),
      answer: bnbRound.answer?.toString(),
      startedAt: bnbRound.startedAt?.toString(),
      updatedAt: bnbRound.updatedAt?.toString(),
      answeredInRound: bnbRound.answeredInRound?.toString(),
    });

    const bnbDecimals = await bnbContract.decimals();
    console.log(" [BNB] Decimals:", bnbDecimals.toString());

    const bnbPrice = Number(bnbRound.answer) / 10 ** Number(bnbDecimals);
    console.log("[BNB] Final BNB/USD price:", bnbPrice);

    // ── Tron TRX/USD ─────────────────────────────────────────────
    console.log(" [TRX] Connecting to TronWeb Chainlink TRX/USD feed...");
    console.log(" [TRX] TronWeb fullNode:", tronWeb?.fullNode?.host || "unknown");
    console.log(" [TRX] TronWeb solidityNode:", tronWeb?.solidityNode?.host || "unknown");
    console.log(" [TRX] Contract address:", tronChainlink.address);
    console.log(" [TRX] TronWeb defaultAddress:", tronWeb?.defaultAddress?.base58 || "NOT SET ⚠️");

    const trxContract = await tronWeb.contract().at(tronChainlink.address);
    console.log(" [TRX] Contract instance created:", !!trxContract);
    console.log(" [TRX] Available contract methods:", Object.keys(trxContract?.methodInstances || {}).join(", ") || "none found ⚠️");

    console.log(" [TRX] Calling latestRoundData()...");
    const trxRound = await trxContract.latestRoundData().call();
    console.log(" [TRX] Raw latestRoundData response:", trxRound);
    console.log(" [TRX] Response type:", typeof trxRound);
    console.log(" [TRX] Response keys:", Object.keys(trxRound || {}));

    console.log(" [TRX] Calling decimals()...");
    const trxDecimals = await trxContract.decimals().call();
    console.log(" [TRX] Raw decimals response:", trxDecimals);

    // Safe answer extraction with full logging
    let trxAnswerStr;
    if (trxRound.answer !== undefined && trxRound.answer !== null) {
      trxAnswerStr = trxRound.answer.toString ? trxRound.answer.toString() : String(trxRound.answer);
      console.log(" [TRX] Answer extracted via named key 'answer':", trxAnswerStr);
    } else if (trxRound[1] !== undefined && trxRound[1] !== null) {
      trxAnswerStr = trxRound[1].toString ? trxRound[1].toString() : String(trxRound[1]);
      console.log("[TRX] Answer extracted via index [1]:", trxAnswerStr);
    } else {
      console.error(" [TRX]  Could not extract answer. Full trxRound dump:", JSON.stringify(trxRound, null, 2));
      throw new Error("Unexpected format from TRX/USD latestRoundData");
    }

    const trxPrice = Number(trxAnswerStr) / 10 ** Number(trxDecimals);
    console.log(" [TRX] Final TRX/USD price:", trxPrice);

    // ── Staleness Check ──────────────────────────────────────────
    const now = Math.floor(Date.now() / 1000);
    const trxUpdatedAt = Number(trxRound.updatedAt ?? trxRound[3] ?? 0);
    const trxAge = now - trxUpdatedAt;
    console.log("[TRX] Feed age (seconds):", trxAge);
    if (trxUpdatedAt === 0) {
      console.warn("[TRX] updatedAt is 0 — could not determine feed freshness");
    } else if (trxAge > 1800) {
      console.warn(` [TRX] Feed is stale! Last updated ${Math.round(trxAge / 60)} minutes ago`);
    } else {
      console.log(` [TRX] Feed is fresh (updated ${Math.round(trxAge / 60)} min ago)`);
    }

    const result = { eth: ethPrice, bnb: bnbPrice, trx: trxPrice };
    console.log("🏁 [getNativePrices] All prices fetched successfully:", result);
    return result;

  } catch (err) {
    console.error(" [getNativePrices] Price fetch failed!");
    console.error(" Error name:", err.name);
    console.error(" Error message:", err.message);
    console.error(" Error stack:", err.stack);

    // Extra hints based on common error patterns
    if (err.message?.includes("could not detect network")) {
      console.error("HINT: Provider RPC URL is wrong or unreachable. Check ethProvider / bscProvider config.");
    }
    if (err.message?.includes("missing revert data") || err.message?.includes("call revert")) {
      console.error("HINT: Contract call reverted. Likely wrong contract address or ABI mismatch.");
    }
    if (err.message?.includes("invalid address")) {
      console.error("HINT: One of the Chainlink addresses is invalid or not checksummed correctly.");
    }
    if (err.message?.includes("CONTRACT_ADDRESS")) {
      console.error("HINT: TronWeb contract address may be in wrong format (use Base58, not hex).");
    }
    if (err.message?.includes("timeout") || err.message?.includes("TIMEOUT")) {
      console.error("HINT: RPC request timed out. Check your RPC endpoint or API key rate limits.");
    }

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
    console.error("Error fetching price:", err.message);
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
    console.error("Error fetching crypto prices:", err.message);
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

    return res.json({
      BNB: nativePrices?.bnb || null,
      ETH: nativePrices?.eth || null,
      TRX: nativePrices?.trx || null,
      NILA: nilaPrice || 0.08,
      timestamp: Date.now()
    });

  } catch (err) {
    console.error("Error fetching prices:", err.message);
    return res.status(500).json({
      error: "Failed to fetch prices",
      fallback: {
        BNB: 600,
        ETH: 3000,
        TRX: 0.12,
        NILA: 0.08,
        timestamp: Date.now()
      }
    });
  }
});

// ─── Create Order ─────────────────────────────────────────────────────────────

app.post("/create-order", async (req, res) => {
  const { wallet, pyrandAmount, network, trcWallet } = req.body;

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

  const order = await Order.create({
    orderId,
    userWallet: wallet.toLowerCase(),
    network,
    trcWallet: isTRON
      ? (trcWallet?.toLowerCase() || wallet.toLowerCase())
      : undefined,
    pyrandAmount: pyrand,
    stableAmount,
    cryptoAmount,
    cryptoRate,
    priceAtCreation: livePrice,
    status: "PENDING_PAYMENT",
  });

  return res.json({ orderId, network, recipient, stableAmount, cryptoAmount });
});

// ─── Get Order ────────────────────────────────────────────────────────────────

app.get("/order/:orderId", async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.orderId }).lean().exec();
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

  if (!orderId || !txHash || !network) {
    return res.status(400).json({ error: "Missing required fields: orderId, txHash, network" });
  }

  // ── 1. Load order ──────────────────────────────────────────────────────────
  const order = await Order.findOne({ orderId });
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.status === "PAID") return res.status(400).json({ error: "Order already paid" });

  // ── 2. Idempotency guard ───────────────────────────────────────────────────
  const alreadyProcessed = await ProcessedTx.findOne({ txHash });
  if (alreadyProcessed) {
    return res.status(400).json({ error: "Transaction already processed" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Lock the txHash row immediately
    await ProcessedTx.create([{ txHash }], { session });

    let pyrandToSend = 0;

    // ── 3. Verify on-chain ─────────────────────────────────────────────────

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

    // ── 4. Send tokens ─────────────────────────────────────────────────────
    const tokenTx = await adminStakeForUser(order.userWallet, pyrandToSend);

    // ── 5. Update order ────────────────────────────────────────────────────
    order.status = "PAID";
    order.txHash = txHash;
    order.pyrandAmount = pyrandToSend;
    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    console.log("PAYMENT VERIFIED & TOKENS SENT");
    console.log("Network:", network);
    console.log("PYRAND sent:", pyrandToSend);
    console.log("Token TX:", tokenTx);

    return res.json({
      success: true,
      pyrandSent: pyrandToSend,
      tokenTx,
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    if (err.code === 11000) {
      return res.status(400).json({ error: "Transaction already being processed" });
    }

    console.error(" verify-transaction error:", err.message);
    return res.status(500).json({ error: err.message || "Verification failed" });
  }
});


async function verifyERC20Stable(txHash, order, provider, network) {
  // const receipt = await provider.getTransactionReceipt(txHash);
  const receipt = await getEvmConfirmedTx(provider, txHash);
  if (!receipt) throw new Error("Transaction not found on-chain");
  if (receipt.status !== 1) throw new Error("Transaction failed on-chain");

  // Determine token contract address and decimals
  let tokenAddress, decimals;

  if (network === "ETH_USDC") {
    tokenAddress = ethUsdc.address.toLowerCase();
    decimals = 6;
  } else if (network === "ETH_USDT") {
    tokenAddress = ethUsdt.ethUsdtddress.toLowerCase();
    decimals = 6;
  } else if (network === "BSC_USDT") {
    tokenAddress = bscUsdt.bscUsdtddress.toLowerCase();
    decimals = 18; // BSC USDT uses 18 decimals
  } else if (network === "BSC_USDC") {
    tokenAddress = bscUsdc.bscUsdcddress.toLowerCase();
    decimals = 18;
  } else {
    throw new Error("Unknown stablecoin network: " + network);
  }

  // ERC20 Transfer topic: Transfer(address,address,uint256)
  const transferTopic = ethers.id("Transfer(address,address,uint256)");

  let stableAmountPaid = null;

  for (const log of receipt.logs) {
    if (
      log.address.toLowerCase() !== tokenAddress ||
      log.topics[0] !== transferTopic ||
      log.topics.length < 3
    ) continue;

    // const to = "0x" + log.topics[2].slice(26);
    // if (to.toLowerCase() !== ERC20_RECIPIENT.toLowerCase()) continue;

const from = "0x" + log.topics[1].slice(26);
const to = "0x" + log.topics[2].slice(26);

//  Verify recipient
if (to.toLowerCase() !== ERC20_RECIPIENT.toLowerCase()) continue;

//  Verify sender
if (from.toLowerCase() !== order.userWallet.toLowerCase()) {
  throw new Error("Transaction sender does not match order wallet");
}

    stableAmountPaid = Number(ethers.formatUnits(log.data, decimals));
    break;
  }

  if (stableAmountPaid === null) {
    throw new Error("No matching token transfer found in transaction logs");
  }

  const pyrandToSend = Number((stableAmountPaid / order.priceAtCreation).toFixed(6));
  if (pyrandToSend <= 0) throw new Error("Calculated PYRAND amount is zero");

  // Update stableAmount on order with what was actually paid
  order.stableAmount = stableAmountPaid;

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

  for (let i = 0; i < retry; i++) {

    try {

      const receipt = await provider.getTransactionReceipt(txHash);

      if (receipt && receipt.status === 1) {
        return receipt;
      }

    } catch (err) {
      console.log("RPC query error:", err.message);
    }

    await new Promise(r => setTimeout(r, 1500));
  }

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
  let contractAddrHex = tronWeb.address
    .toHex(trc20Data.address)
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
});
