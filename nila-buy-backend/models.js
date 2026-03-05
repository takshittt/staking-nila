// models.js - Shared MongoDB models

import mongoose from "mongoose";

// ─── User Schema (Shared with main backend) ──────────────────────────────────

const UserSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true, unique: true, lowercase: true },
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const User = mongoose.model("User", UserSchema);

// ─── Stake Schema (Shared with main backend) ─────────────────────────────────

const StakeSchema = new mongoose.Schema({
  stakeId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  walletAddress: { type: String, required: true, lowercase: true },
  planName: { type: String, required: true },
  planVersion: { type: Number, default: 1 },
  amount: { type: String, required: true }, // Changed to String to match Prisma schema
  apy: { type: String, required: true },    // Changed to String to match Prisma schema
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ["active", "completed"], default: "active" },
  txHash: { type: String },
  onChainStakeId: { type: Number },
  source: { type: String, enum: ["buy_stake", "direct_stake", "admin"], default: "buy_stake" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const Stake = mongoose.model("Stake", StakeSchema);

// ─── Transaction Schema (Shared with main backend) ───────────────────────────

const TransactionSchema = new mongoose.Schema({
  txHash: { type: String, required: true, unique: true },
  walletAddress: { type: String, required: true, lowercase: true },
  type: { type: String, enum: ["STAKE", "UNSTAKE", "CLAIM", "PAYMENT"], required: true },
  amount: { type: String, required: true }, // Changed to String to match Prisma schema
  status: { type: String, enum: ["pending", "confirmed", "failed"], default: "pending" },
  metadata: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const Transaction = mongoose.model("Transaction", TransactionSchema);

// ─── Referral Schema (Shared with main backend) ──────────────────────────────

const ReferralSchema = new mongoose.Schema({
  referrerWallet: { type: String, required: true, lowercase: true },
  referredWallet: { type: String, required: true, lowercase: true },
  earnings: { type: String, default: "0" }, // Changed to String to match Prisma schema
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const Referral = mongoose.model("Referral", ReferralSchema);

// ─── Order Schema (nila-buy-backend only) ────────────────────────────────────

const OrderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  userWallet: { type: String, required: true, lowercase: true },
  trcWallet: { type: String, lowercase: true },
  network: { type: String, required: true },
  pyrandAmount: { type: Number, required: true },
  stableAmount: { type: Number },
  cryptoAmount: { type: Number },
  priceAtCreation: { type: Number },
  status: { type: String, enum: ["PENDING_PAYMENT", "PAID", "FAILED"], default: "PENDING_PAYMENT" },
  txHash: { type: String, unique: true, sparse: true },
  stakeTxHash: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const Order = mongoose.model("Order", OrderSchema);

// ─── ProcessedTx Schema (nila-buy-backend only) ──────────────────────────────

const ProcessedTxSchema = new mongoose.Schema({
  txHash: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});

export const ProcessedTx = mongoose.model("ProcessedTx", ProcessedTxSchema);
