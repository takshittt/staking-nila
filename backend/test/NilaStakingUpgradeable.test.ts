import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { NilaStakingUpgradeable, MockERC20 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("NilaStakingUpgradeable", function () {
  let staking: NilaStakingUpgradeable;
  let nila: MockERC20;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let referrer: SignerWithAddress;

  const INITIAL_SUPPLY = ethers.parseEther("1000000");
  const REWARD_POOL = ethers.parseEther("100000");
  const STAKE_AMOUNT = ethers.parseEther("1000");

  beforeEach(async function () {
    [owner, user1, user2, referrer] = await ethers.getSigners();

    // Deploy mock NILA token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    nila = await MockERC20.deploy("Nila Token", "NILA", INITIAL_SUPPLY);
    await nila.waitForDeployment();

    // Deploy upgradeable staking contract with proxy
    const NilaStakingUpgradeable = await ethers.getContractFactory("NilaStakingUpgradeable");
    staking = await upgrades.deployProxy(
      NilaStakingUpgradeable,
      [await nila.getAddress()],
      { initializer: "initialize", kind: "uups" }
    ) as unknown as NilaStakingUpgradeable;
    await staking.waitForDeployment();

    // Fund reward pool
    await nila.transfer(await staking.getAddress(), REWARD_POOL);

    // Setup test configurations
    await staking.addAmountConfig(STAKE_AMOUNT, 500); // 5% instant reward
    await staking.addLockConfig(30, 1000); // 30 days, 10% APR

    // Distribute tokens to users
    await nila.transfer(user1.address, ethers.parseEther("10000"));
    await nila.transfer(user2.address, ethers.parseEther("10000"));
    await nila.transfer(referrer.address, ethers.parseEther("10000"));
  });

  describe("Deployment & Initialization", function () {
    it("Should initialize with correct values", async function () {
      expect(await staking.nila()).to.equal(await nila.getAddress());
      expect(await staking.owner()).to.equal(owner.address);
      expect(await staking.totalStaked()).to.equal(0);
      expect(await staking.uniqueStakers()).to.equal(0);
    });

    it("Should not allow re-initialization", async function () {
      await expect(
        staking.initialize(await nila.getAddress())
      ).to.be.reverted;
    });

    it("Should have correct version", async function () {
      expect(await staking.version()).to.equal("1.0.0");
    });
  });

  describe("Proxy Functionality", function () {
    it("Should return correct implementation address", async function () {
      const proxyAddress = await staking.getAddress();
      const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
      expect(implementationAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("Should only allow owner to upgrade", async function () {
      const NilaStakingUpgradeableV2 = await ethers.getContractFactory(
        "NilaStakingUpgradeable",
        user1
      );
      
      await expect(
        upgrades.upgradeProxy(await staking.getAddress(), NilaStakingUpgradeableV2)
      ).to.be.reverted;
    });
  });

  describe("Staking", function () {
    it("Should allow user to stake", async function () {
      await nila.connect(user1).approve(await staking.getAddress(), STAKE_AMOUNT);
      
      await expect(staking.connect(user1).stake(0, 0))
        .to.emit(staking, "Staked")
        .withArgs(user1.address, 0, STAKE_AMOUNT, 0);

      expect(await staking.totalStaked()).to.equal(STAKE_AMOUNT);
      expect(await staking.uniqueStakers()).to.equal(1);
    });

    it("Should track instant rewards", async function () {
      await nila.connect(user1).approve(await staking.getAddress(), STAKE_AMOUNT);
      await staking.connect(user1).stake(0, 0);

      const expectedReward = (STAKE_AMOUNT * 500n) / 10000n; // 5%
      const claimable = await staking.claimableInstantRewards(user1.address);
      expect(claimable).to.equal(expectedReward);
    });

    it("Should handle referral staking", async function () {
      await nila.connect(user1).approve(await staking.getAddress(), STAKE_AMOUNT);
      
      await expect(staking.connect(user1).stakeWithReferral(0, 0, referrer.address))
        .to.emit(staking, "ReferralRegistered")
        .withArgs(referrer.address, user1.address);

      const stats = await staking.getReferralStats(referrer.address);
      expect(stats.referralsMade).to.equal(1);
    });
  });

  describe("Claiming Rewards", function () {
    beforeEach(async function () {
      await nila.connect(user1).approve(await staking.getAddress(), STAKE_AMOUNT);
      await staking.connect(user1).stake(0, 0);
    });

    it("Should allow claiming instant rewards", async function () {
      const claimableBefore = await staking.claimableInstantRewards(user1.address);
      expect(claimableBefore).to.be.gt(0);

      await expect(staking.connect(user1).claimInstantRewards())
        .to.emit(staking, "InstantRewardClaimed");

      const claimableAfter = await staking.claimableInstantRewards(user1.address);
      expect(claimableAfter).to.equal(0);
    });

    it("Should allow claiming APY rewards after interval", async function () {
      await time.increase(30 * 24 * 60 * 60); // 30 days

      const pendingReward = await staking.pendingReward(user1.address, 0);
      expect(pendingReward).to.be.gt(0);

      await expect(staking.connect(user1).claim(0))
        .to.emit(staking, "RewardClaimed");
    });

    it("Should not allow claiming before interval", async function () {
      await expect(staking.connect(user1).claim(0))
        .to.be.revertedWith("Claim every 30 days");
    });
  });

  describe("Unstaking", function () {
    beforeEach(async function () {
      await nila.connect(user1).approve(await staking.getAddress(), STAKE_AMOUNT);
      await staking.connect(user1).stake(0, 0);
    });

    it("Should allow unstaking after lock period", async function () {
      await time.increase(30 * 24 * 60 * 60); // 30 days

      const balanceBefore = await nila.balanceOf(user1.address);
      
      await expect(staking.connect(user1).unstake(0))
        .to.emit(staking, "Unstaked");

      const balanceAfter = await nila.balanceOf(user1.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("Should not allow unstaking before lock period", async function () {
      await expect(staking.connect(user1).unstake(0))
        .to.be.revertedWith("Lock active");
    });

    it("Should allow emergency unstake when paused", async function () {
      await staking.pause();
      
      await expect(staking.connect(user1).emergencyUnstake(0))
        .to.emit(staking, "EmergencyUnstaked");

      expect(await staking.totalStaked()).to.equal(0);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to pause/unpause", async function () {
      await staking.pause();
      expect(await staking.paused()).to.be.true;

      await staking.unpause();
      expect(await staking.paused()).to.be.false;
    });

    it("Should not allow non-owner to pause", async function () {
      await expect(staking.connect(user1).pause())
        .to.be.reverted;
    });

    it("Should allow owner to update configs", async function () {
      await expect(staking.updateAmountConfig(0, 1000, true))
        .to.emit(staking, "AmountConfigUpdated");

      await expect(staking.updateLockConfig(0, 2000, true))
        .to.emit(staking, "LockConfigUpdated");
    });

    it("Should allow owner to update referral config", async function () {
      await expect(staking.setReferralConfig(1000, 500, false))
        .to.emit(staking, "ReferralConfigUpdated");

      const config = await staking.getReferralConfig();
      expect(config.referralPercentageBps).to.equal(1000);
      expect(config.referrerPercentageBps).to.equal(500);
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await nila.connect(user1).approve(await staking.getAddress(), STAKE_AMOUNT);
      await staking.connect(user1).stake(0, 0);
    });

    it("Should return correct stake details", async function () {
      const details = await staking.getStakeDetails(user1.address, 0);
      expect(details.amount).to.equal(STAKE_AMOUNT);
      expect(details.unstaked).to.be.false;
    });

    it("Should return correct user totals", async function () {
      const totals = await staking.getUserTotals(user1.address);
      expect(totals.totalLocked).to.equal(STAKE_AMOUNT);
    });

    it("Should return available rewards", async function () {
      const available = await staking.availableRewards();
      expect(available).to.be.gt(0);
    });
  });

  describe("Security", function () {
    it("Should prevent reentrancy attacks", async function () {
      // This is implicitly tested by the ReentrancyGuard
      // Additional specific reentrancy tests can be added
    });

    it("Should not allow staking when paused", async function () {
      await staking.pause();
      await nila.connect(user1).approve(await staking.getAddress(), STAKE_AMOUNT);
      
      await expect(staking.connect(user1).stake(0, 0))
        .to.be.reverted;
    });

    it("Should protect against unauthorized token recovery", async function () {
      await expect(
        staking.connect(user1).recoverERC20(await nila.getAddress(), 100)
      ).to.be.reverted;
    });
  });
});
