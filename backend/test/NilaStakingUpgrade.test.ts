import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { NilaStakingUpgradeable, MockERC20 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("NilaStaking Upgrade Tests", function () {
  let stakingV1: NilaStakingUpgradeable;
  let nila: MockERC20;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let proxyAddress: string;

  const INITIAL_SUPPLY = ethers.parseEther("1000000");
  const REWARD_POOL = ethers.parseEther("100000");
  const STAKE_AMOUNT = ethers.parseEther("1000");

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();

    // Deploy mock NILA token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    nila = await MockERC20.deploy("Nila Token", "NILA", INITIAL_SUPPLY);
    await nila.waitForDeployment();

    // Deploy V1 with proxy
    const NilaStakingUpgradeable = await ethers.getContractFactory("NilaStakingUpgradeable");
    stakingV1 = await upgrades.deployProxy(
      NilaStakingUpgradeable,
      [await nila.getAddress()],
      { initializer: "initialize", kind: "uups" }
    ) as unknown as NilaStakingUpgradeable;
    await stakingV1.waitForDeployment();
    proxyAddress = await stakingV1.getAddress();

    // Setup initial state
    await nila.transfer(proxyAddress, REWARD_POOL);
    await stakingV1.addAmountConfig(STAKE_AMOUNT, 500);
    await stakingV1.addLockConfig(30, 1000);

    // Create a stake
    await nila.transfer(user1.address, ethers.parseEther("10000"));
    await nila.connect(user1).approve(proxyAddress, STAKE_AMOUNT);
    await stakingV1.connect(user1).stake(0, 0);
  });

  describe("Upgrade Process", function () {
    it("Should successfully upgrade to V2", async function () {
      const implementationV1 = await upgrades.erc1967.getImplementationAddress(proxyAddress);

      // Upgrade to V2 using the actual V2 contract
      const NilaStakingUpgradeableV2 = await ethers.getContractFactory("NilaStakingUpgradeableV2");
      const stakingV2 = await upgrades.upgradeProxy(
        proxyAddress,
        NilaStakingUpgradeableV2,
        { kind: "uups" }
      );

      const implementationV2 = await upgrades.erc1967.getImplementationAddress(proxyAddress);

      // Implementation should change
      expect(implementationV2).to.not.equal(implementationV1);
      
      // Proxy address should remain the same
      expect(await stakingV2.getAddress()).to.equal(proxyAddress);
    });

    it("Should preserve state after upgrade", async function () {
      // Record state before upgrade
      const totalStakedBefore = await stakingV1.totalStaked();
      const uniqueStakersBefore = await stakingV1.uniqueStakers();
      const userStakesBefore = await stakingV1.getUserStakes(user1.address);
      const amountConfigCountBefore = await stakingV1.getAmountConfigCount();
      const lockConfigCountBefore = await stakingV1.getLockConfigCount();

      // Upgrade
      const NilaStakingUpgradeableV2 = await ethers.getContractFactory("NilaStakingUpgradeable");
      const stakingV2 = await upgrades.upgradeProxy(
        proxyAddress,
        NilaStakingUpgradeableV2,
        { kind: "uups" }
      ) as unknown as NilaStakingUpgradeable;

      // Verify state preservation
      expect(await stakingV2.totalStaked()).to.equal(totalStakedBefore);
      expect(await stakingV2.uniqueStakers()).to.equal(uniqueStakersBefore);
      expect(await stakingV2.getAmountConfigCount()).to.equal(amountConfigCountBefore);
      expect(await stakingV2.getLockConfigCount()).to.equal(lockConfigCountBefore);

      const userStakesAfter = await stakingV2.getUserStakes(user1.address);
      expect(userStakesAfter.length).to.equal(userStakesBefore.length);
      expect(userStakesAfter[0].amount).to.equal(userStakesBefore[0].amount);
    });

    it("Should maintain functionality after upgrade", async function () {
      // Upgrade
      const NilaStakingUpgradeableV2 = await ethers.getContractFactory("NilaStakingUpgradeable");
      const stakingV2 = await upgrades.upgradeProxy(
        proxyAddress,
        NilaStakingUpgradeableV2,
        { kind: "uups" }
      ) as unknown as NilaStakingUpgradeable;

      // Test that existing functionality still works
      const claimable = await stakingV2.claimableInstantRewards(user1.address);
      expect(claimable).to.be.gt(0);

      // Claim instant rewards
      await expect(stakingV2.connect(user1).claimInstantRewards())
        .to.emit(stakingV2, "InstantRewardClaimed");

      // Add new config
      await expect(stakingV2.addAmountConfig(ethers.parseEther("2000"), 1000))
        .to.emit(stakingV2, "AmountConfigAdded");
    });

    it("Should only allow owner to upgrade", async function () {
      const NilaStakingUpgradeableV2 = await ethers.getContractFactory(
        "NilaStakingUpgradeable",
        user1
      );

      await expect(
        upgrades.upgradeProxy(proxyAddress, NilaStakingUpgradeableV2)
      ).to.be.reverted;
    });

    it("Should emit upgrade event", async function () {
      const NilaStakingUpgradeableV2 = await ethers.getContractFactory("NilaStakingUpgradeableV2");
      
      // Deploy new implementation
      const newImplFactory = await ethers.getContractFactory("NilaStakingUpgradeableV2");
      const newImpl = await newImplFactory.deploy();
      await newImpl.waitForDeployment();
      const newImplAddress = await newImpl.getAddress();
      
      // Call upgradeToAndCall directly on the proxy to capture the event
      const upgradeInterface = new ethers.Interface([
        "function upgradeToAndCall(address newImplementation, bytes memory data)"
      ]);
      
      // Perform upgrade through the proxy's upgradeToAndCall function
      await expect(
        stakingV1.upgradeToAndCall(newImplAddress, "0x")
      ).to.emit(stakingV1, "ContractUpgraded").withArgs(newImplAddress);
    });
  });

  describe("Storage Layout Validation", function () {
    it("Should validate storage layout compatibility", async function () {
      const NilaStakingUpgradeableV2 = await ethers.getContractFactory("NilaStakingUpgradeable");
      
      // This will throw if storage layout is incompatible
      await expect(
        upgrades.validateUpgrade(proxyAddress, NilaStakingUpgradeableV2, { kind: "uups" })
      ).to.not.be.reverted;
    });
  });

  describe("Post-Upgrade Operations", function () {
    let stakingV2: NilaStakingUpgradeable;

    beforeEach(async function () {
      const NilaStakingUpgradeableV2 = await ethers.getContractFactory("NilaStakingUpgradeable");
      stakingV2 = await upgrades.upgradeProxy(
        proxyAddress,
        NilaStakingUpgradeableV2,
        { kind: "uups" }
      ) as unknown as NilaStakingUpgradeable;
    });

    it("Should allow new stakes after upgrade", async function () {
      const user2 = (await ethers.getSigners())[2];
      await nila.transfer(user2.address, ethers.parseEther("10000"));
      await nila.connect(user2).approve(proxyAddress, STAKE_AMOUNT);

      await expect(stakingV2.connect(user2).stake(0, 0))
        .to.emit(stakingV2, "Staked");

      expect(await stakingV2.uniqueStakers()).to.equal(2);
    });

    it("Should allow existing users to unstake after upgrade", async function () {
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);

      const balanceBefore = await nila.balanceOf(user1.address);
      
      await expect(stakingV2.connect(user1).unstake(0))
        .to.emit(stakingV2, "Unstaked");

      const balanceAfter = await nila.balanceOf(user1.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("Should maintain admin controls after upgrade", async function () {
      await expect(stakingV2.pause())
        .to.not.be.reverted;

      expect(await stakingV2.paused()).to.be.true;

      await expect(stakingV2.unpause())
        .to.not.be.reverted;

      expect(await stakingV2.paused()).to.be.false;
    });

    it("Should preserve referral system after upgrade", async function () {
      const referrer = (await ethers.getSigners())[2];
      const user2 = (await ethers.getSigners())[3];

      await nila.transfer(user2.address, ethers.parseEther("10000"));
      await nila.connect(user2).approve(proxyAddress, STAKE_AMOUNT);

      await expect(stakingV2.connect(user2).stakeWithReferral(0, 0, referrer.address))
        .to.emit(stakingV2, "ReferralRegistered");

      const stats = await stakingV2.getReferralStats(referrer.address);
      expect(stats.referralsMade).to.equal(1);
    });
  });

  describe("Version Tracking", function () {
    it("Should return correct version", async function () {
      expect(await stakingV1.version()).to.equal("1.0.0");
    });

    it("Should maintain version after upgrade", async function () {
      const NilaStakingUpgradeableV2 = await ethers.getContractFactory("NilaStakingUpgradeable");
      const stakingV2 = await upgrades.upgradeProxy(
        proxyAddress,
        NilaStakingUpgradeableV2,
        { kind: "uups" }
      ) as unknown as NilaStakingUpgradeable;

      // In a real V2, you would update the version string
      expect(await stakingV2.version()).to.equal("1.0.0");
    });
  });
});
