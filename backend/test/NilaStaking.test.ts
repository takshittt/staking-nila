import { expect } from "chai";
import { ethers } from "hardhat";
import { NilaStaking, MockERC20 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("NilaStaking", function () {
  let nilaStaking: NilaStaking;
  let nila: MockERC20;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let other: SignerWithAddress;

  const BPS = 10_000n;
  const CLAIM_INTERVAL = 30 * 24 * 60 * 60; // 30 days
  const INITIAL_BALANCE = ethers.parseEther("1000000");

  beforeEach(async function () {
    [owner, user1, user2, other] = await ethers.getSigners();

    // Deploy mock NILA token
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    nila = await MockERC20Factory.deploy("NILA", "NILA", INITIAL_BALANCE);

    // Deploy staking contract
    const NilaStakingFactory = await ethers.getContractFactory("NilaStaking");
    nilaStaking = await NilaStakingFactory.deploy(await nila.getAddress());

    // Distribute tokens
    await nila.transfer(user1.address, ethers.parseEther("10000"));
    await nila.transfer(user2.address, ethers.parseEther("10000"));

    // Approve staking contract
    await nila.connect(user1).approve(nilaStaking.getAddress(), ethers.MaxUint256);
    await nila.connect(user2).approve(nilaStaking.getAddress(), ethers.MaxUint256);
  });

  describe("A. Deployment & Setup", function () {
    it("Contract deploys with correct owner", async function () {
      expect(await nilaStaking.owner()).to.equal(owner.address);
    });

    it("Initial values are zero", async function () {
      expect(await nilaStaking.totalStaked()).to.equal(0);
      expect(await nilaStaking.uniqueStakers()).to.equal(0);
      expect(await nilaStaking.getAmountConfigCount()).to.equal(0);
      expect(await nilaStaking.getLockConfigCount()).to.equal(0);
    });

    it("NILA token address is set correctly", async function () {
      expect(await nilaStaking.nila()).to.equal(await nila.getAddress());
    });
  });

  describe("B. Admin Actions", function () {
    it("Add amount configs", async function () {
      const amount = ethers.parseEther("100");
      const instantRewardBps = 500; // 5%

      await expect(
        nilaStaking.addAmountConfig(amount, instantRewardBps)
      ).to.emit(nilaStaking, "AmountConfigAdded");

      expect(await nilaStaking.getAmountConfigCount()).to.equal(1);
    });

    it("Add lock configs", async function () {
      const lockDays = 30;
      const apr = 1000; // 10%

      await expect(
        nilaStaking.addLockConfig(lockDays, apr)
      ).to.emit(nilaStaking, "LockConfigAdded");

      expect(await nilaStaking.getLockConfigCount()).to.equal(1);
    });

    it("Pause and unpause", async function () {
      await nilaStaking.pause();
      expect(await nilaStaking.paused()).to.be.true;

      await nilaStaking.unpause();
      expect(await nilaStaking.paused()).to.be.false;
    });

    it("Withdraw excess rewards only when paused", async function () {
      // Fund rewards
      await nila.approve(nilaStaking.getAddress(), ethers.parseEther("1000"));
      await nila.transfer(await nilaStaking.getAddress(), ethers.parseEther("1000"));

      // Should fail when not paused
      await expect(
        nilaStaking.withdrawExcessRewards(ethers.parseEther("100"))
      ).to.be.revertedWith("Contract must be paused");

      // Should succeed when paused
      await nilaStaking.pause();
      await expect(
        nilaStaking.withdrawExcessRewards(ethers.parseEther("100"))
      ).to.emit(nilaStaking, "ExcessRewardsWithdrawn");
    });

    it("Recover non-NILA tokens", async function () {
      // Deploy another token
      const MockERC20Factory = await ethers.getContractFactory("MockERC20");
      const otherToken = await MockERC20Factory.deploy("OTHER", "OTHER", ethers.parseEther("1000"));

      // Send to staking contract
      await otherToken.transfer(await nilaStaking.getAddress(), ethers.parseEther("100"));

      // Recover
      await expect(
        nilaStaking.recoverERC20(await otherToken.getAddress(), ethers.parseEther("100"))
      ).to.emit(nilaStaking, "ERC20Recovered");
    });

    it("Cannot withdraw principal (NILA token)", async function () {
      await nila.transfer(await nilaStaking.getAddress(), ethers.parseEther("1000"));

      await expect(
        nilaStaking.recoverERC20(await nila.getAddress(), ethers.parseEther("100"))
      ).to.be.revertedWith("Cannot recover staking token");
    });
  });

  describe("C. Staking Flow", function () {
    beforeEach(async function () {
      // Setup configs
      await nilaStaking.addAmountConfig(ethers.parseEther("100"), 500); // 5% instant reward
      await nilaStaking.addLockConfig(30, 1000); // 30 days, 10% APR

      // Fund rewards
      await nila.approve(nilaStaking.getAddress(), ethers.parseEther("10000"));
      await nila.transfer(await nilaStaking.getAddress(), ethers.parseEther("10000"));
    });

    it("Stake works with correct amount", async function () {
      const stakeAmount = ethers.parseEther("100");
      const instantReward = (stakeAmount * 500n) / BPS;

      const balanceBefore = await nila.balanceOf(user1.address);

      await expect(
        nilaStaking.connect(user1).stake(0, 0)
      ).to.emit(nilaStaking, "Staked");

      const balanceAfter = await nila.balanceOf(user1.address);

      // User should have paid principal but received instant reward
      expect(balanceBefore - balanceAfter).to.equal(stakeAmount - instantReward);
    });

    it("Instant reward is paid", async function () {
      const stakeAmount = ethers.parseEther("100");
      const instantReward = (stakeAmount * 500n) / BPS;

      const balanceBefore = await nila.balanceOf(user1.address);
      await nilaStaking.connect(user1).stake(0, 0);
      const balanceAfter = await nila.balanceOf(user1.address);

      expect(balanceBefore - balanceAfter).to.equal(stakeAmount - instantReward);
    });

    it("totalStaked is updated", async function () {
      const stakeAmount = ethers.parseEther("100");

      expect(await nilaStaking.totalStaked()).to.equal(0);
      await nilaStaking.connect(user1).stake(0, 0);
      expect(await nilaStaking.totalStaked()).to.equal(stakeAmount);
    });

    it("activeStakeCount increments", async function () {
      expect(await nilaStaking.getUserActiveStakeCount(user1.address)).to.equal(0);
      await nilaStaking.connect(user1).stake(0, 0);
      expect(await nilaStaking.getUserActiveStakeCount(user1.address)).to.equal(1);
    });

    it("Cannot exceed MAX_STAKES_PER_USER", async function () {
      // Add more configs
      for (let i = 0; i < 101; i++) {
        await nilaStaking.addAmountConfig(ethers.parseEther("1"), 0);
      }

      // Try to stake 101 times
      for (let i = 0; i < 100; i++) {
        await nilaStaking.connect(user1).stake(i, 0);
      }

      // 101st should fail
      await expect(
        nilaStaking.connect(user1).stake(100, 0)
      ).to.be.revertedWith("Too many active stakes");
    });
  });

  describe("D. Rewards Logic", function () {
    beforeEach(async function () {
      // Setup configs
      await nilaStaking.addAmountConfig(ethers.parseEther("100"), 0); // No instant reward
      await nilaStaking.addLockConfig(30, 10000); // 30 days, 100% APR

      // Fund rewards
      await nila.approve(nilaStaking.getAddress(), ethers.parseEther("50000"));
      await nila.transfer(await nilaStaking.getAddress(), ethers.parseEther("50000"));

      // Stake
      await nilaStaking.connect(user1).stake(0, 0);
    });

    it("Cannot claim before 30 days", async function () {
      await expect(
        nilaStaking.connect(user1).claim(0)
      ).to.be.revertedWith("Claim every 30 days");
    });

    it("Can claim after 30 days", async function () {
      // Fast forward 30 days
      await ethers.provider.send("hardhat_mine", ["0x" + (CLAIM_INTERVAL + 1).toString(16)]);

      await expect(
        nilaStaking.connect(user1).claim(0)
      ).to.emit(nilaStaking, "RewardClaimed");
    });

    it("Rewards increase with time", async function () {
      // Fast forward 15 days
      await ethers.provider.send("hardhat_mine", ["0x" + (15 * 24 * 60 * 60).toString(16)]);
      const reward15Days = await nilaStaking.pendingReward(user1.address, 0);

      // Fast forward another 15 days (total 30)
      await ethers.provider.send("hardhat_mine", ["0x" + (15 * 24 * 60 * 60).toString(16)]);
      const reward30Days = await nilaStaking.pendingReward(user1.address, 0);

      expect(reward30Days).to.be.greaterThan(reward15Days);
    });

    it("Claim resets lastClaimTime", async function () {
      // Fast forward 30 days
      await ethers.provider.send("hardhat_mine", ["0x" + (CLAIM_INTERVAL + 1).toString(16)]);

      const blockBefore = await ethers.provider.getBlock("latest");
      await nilaStaking.connect(user1).claim(0);
      const blockAfter = await ethers.provider.getBlock("latest");

      // Get stake details
      const details = await nilaStaking.getStakeDetails(user1.address, 0);
      expect(details.lastClaimTime).to.be.closeTo(blockAfter!.timestamp, 2);
    });

    it("Reward pool protection works", async function () {
      // Fast forward 30 days
      await ethers.provider.send("hardhat_mine", ["0x" + (CLAIM_INTERVAL + 1).toString(16)]);

      // Drain reward pool
      const excess = await nilaStaking.availableRewards();
      await nilaStaking.pause();
      await nilaStaking.withdrawExcessRewards(excess);
      await nilaStaking.unpause();

      // Try to claim - should fail
      await expect(
        nilaStaking.connect(user1).claim(0)
      ).to.be.revertedWith("Insufficient reward pool");
    });
  });

  describe("E. Unstake & Emergency", function () {
    beforeEach(async function () {
      // Setup configs
      await nilaStaking.addAmountConfig(ethers.parseEther("100"), 0);
      await nilaStaking.addLockConfig(30, 1000); // 30 days, 10% APR

      // Fund rewards
      await nila.approve(nilaStaking.getAddress(), ethers.parseEther("50000"));
      await nila.transfer(await nilaStaking.getAddress(), ethers.parseEther("50000"));

      // Stake
      await nilaStaking.connect(user1).stake(0, 0);
    });

    it("Cannot unstake before lock expires", async function () {
      await expect(
        nilaStaking.connect(user1).unstake(0)
      ).to.be.revertedWith("Lock active");
    });

    it("Can unstake after lock expires", async function () {
      // Fast forward 30 days
      await ethers.provider.send("hardhat_mine", ["0x" + (30 * 24 * 60 * 60 + 1).toString(16)]);

      await expect(
        nilaStaking.connect(user1).unstake(0)
      ).to.emit(nilaStaking, "Unstaked");
    });

    it("Unstake pays all pending APR", async function () {
      // Fast forward 30 days
      await ethers.provider.send("hardhat_mine", ["0x" + (30 * 24 * 60 * 60 + 1).toString(16)]);

      const pendingReward = await nilaStaking.pendingReward(user1.address, 0);
      const balanceBefore = await nila.balanceOf(user1.address);

      await nilaStaking.connect(user1).unstake(0);

      const balanceAfter = await nila.balanceOf(user1.address);
      const received = balanceAfter - balanceBefore;

      // Should receive principal + reward (allow small variance due to block timing)
      const expected = ethers.parseEther("100") + pendingReward;
      expect(received).to.be.closeTo(expected, ethers.parseEther("0.01"));
    });

    it("Emergency unstake returns principal only", async function () {
      // Fast forward some time to accumulate rewards
      await ethers.provider.send("hardhat_mine", ["0x" + (15 * 24 * 60 * 60).toString(16)]);

      const balanceBefore = await nila.balanceOf(user1.address);

      // Pause and emergency unstake
      await nilaStaking.pause();
      await nilaStaking.connect(user1).emergencyUnstake(0);

      const balanceAfter = await nila.balanceOf(user1.address);
      const received = balanceAfter - balanceBefore;

      // Should receive only principal, no rewards
      expect(received).to.equal(ethers.parseEther("100"));
    });

    it("Emergency unstake only works when paused", async function () {
      await expect(
        nilaStaking.connect(user1).emergencyUnstake(0)
      ).to.be.revertedWith("Only when paused");

      await nilaStaking.pause();
      await expect(
        nilaStaking.connect(user1).emergencyUnstake(0)
      ).to.emit(nilaStaking, "EmergencyUnstaked");
    });
  });
});
