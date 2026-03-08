// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract NilaStakingUpgradeable is 
    Initializable,
    ReentrancyGuardUpgradeable, 
    PausableUpgradeable, 
    OwnableUpgradeable,
    UUPSUpgradeable 
{
    IERC20 public nila;

    uint256 public constant BPS = 10_000;
    uint256 public constant CLAIM_INTERVAL = 30 days;
    uint256 public constant MAX_STAKES_PER_USER = 100;
    uint256 public constant MIN_STAKE_AMOUNT = 10 * 10**18; // 10 NILA minimum

    /* ================= GLOBAL ACCOUNTING ================= */
    uint256 public totalStaked;
    uint256 public uniqueStakers;
    mapping(address => bool) private hasStaked;

    /* ================= CONFIG STRUCTS ================= */
    struct AmountConfig {
        uint256 amount;
        bool active;
    }

    struct LockConfig {
        uint256 lockDuration;
        uint256 apr;
        bool active;
    }

    struct StakeInfo {
        uint256 amount;
        uint256 startTime;
        uint256 lastClaimTime;
        uint256 unlockTime;
        uint256 aprSnapshot;
        uint256 instantRewardSnapshot;
        bool unstaked;
    }

    struct ReferralConfig {
        uint256 referralPercentageBps;
        uint256 referrerPercentageBps;
        bool isPaused;
    }

    struct RewardTier {
        uint256 minNilaAmount;
        uint256 maxNilaAmount;
        uint256 instantRewardBps;
        bool active;
    }

    struct StakeDetails {
        uint256 amount;
        uint256 startTime;
        uint256 lastClaimTime;
        uint256 unlockTime;
        uint256 apr;
        uint256 instantReward;
        bool unstaked;
        uint256 pendingRewards;
        bool canClaim;
        bool canUnstake;
    }

    AmountConfig[] public amountConfigs;
    LockConfig[] public lockConfigs;
    RewardTier[] public rewardTiers;
    mapping(address => StakeInfo[]) private userStakes;
    mapping(address => uint256) public activeStakeCount;

    /* ================= REFERRAL SYSTEM ================= */
    ReferralConfig public referralConfig;
    mapping(address => address) public referrers;
    mapping(address => uint256) public referralCount;
    mapping(address => uint256) public referralEarnings;
    
    /* ================= CLAIMABLE REWARDS ================= */
    mapping(address => uint256) public claimableInstantRewards;
    mapping(address => uint256) public claimableReferralRewards;

    /* ================= EVENTS ================= */
    event AmountConfigAdded(uint256 indexed id, uint256 amount);
    event AmountConfigUpdated(uint256 indexed id, bool active);
    event LockConfigAdded(uint256 indexed id, uint256 lockDuration, uint256 apr);
    event LockConfigUpdated(uint256 indexed id, uint256 apr, bool active);
    event RewardTierAdded(uint256 indexed id, uint256 minAmount, uint256 maxAmount, uint256 instantRewardBps);
    event RewardTierUpdated(uint256 indexed id, uint256 minAmount, uint256 maxAmount, uint256 instantRewardBps, bool active);
    event Staked(address indexed user, uint256 indexed stakeId, uint256 amount, uint256 lockId);
    event TokenPurchaseStaked(address indexed user, uint256 indexed stakeId, uint256 nilaAmount, uint256 instantReward);
    event RewardClaimed(address indexed user, uint256 indexed stakeId, uint256 reward);
    event Unstaked(address indexed user, uint256 indexed stakeId, uint256 amount);
    event EmergencyUnstaked(address indexed user, uint256 indexed stakeId, uint256 amount);
    event ExcessRewardsWithdrawn(address indexed owner, uint256 amount);
    event ERC20Recovered(address indexed token, uint256 amount);
    event ReferralConfigUpdated(uint256 referralPercentageBps, uint256 referrerPercentageBps, bool isPaused);
    event ReferralRegistered(address indexed referrer, address indexed referred);
    event ReferralRewardPaid(address indexed referrer, address indexed referred, uint256 amount);
    event InstantRewardClaimed(address indexed user, uint256 indexed stakeId, uint256 amount);
    event ReferralBonusClaimed(address indexed user, uint256 amount);
    event ContractUpgraded(address indexed newImplementation);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _nila) public initializer {
        require(_nila != address(0), "Invalid NILA token");
        
        __ReentrancyGuard_init();
        __Pausable_init();
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        
        nila = IERC20(_nila);
        
        referralConfig = ReferralConfig({
            referralPercentageBps: 500,
            referrerPercentageBps: 200,
            isPaused: false
        });
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {
        emit ContractUpgraded(newImplementation);
    }

    /* ================= REWARD POOL ================= */
    function availableRewards() public view returns (uint256) {
        uint256 balance = nila.balanceOf(address(this));
        return balance > totalStaked ? balance - totalStaked : 0;
    }

    /* ================= INTERNAL ================= */
    function _validateIndex(address user, uint256 index) internal view {
        require(index < userStakes[user].length, "Bad index");
    }

    /* ================= ADMIN ================= */

    function addAmountConfig(uint256 amount) external onlyOwner {
        require(amount > 0, "Invalid amount");
        amountConfigs.push(AmountConfig(amount, true));
        emit AmountConfigAdded(amountConfigs.length - 1, amount);
    }

    function updateAmountConfig(uint256 id, bool active) external onlyOwner {
        require(id < amountConfigs.length, "Invalid config id");
        amountConfigs[id].active = active;
        emit AmountConfigUpdated(id, active);
    }

    function addLockConfig(uint256 lockDays, uint256 apr) external onlyOwner {
        require(lockDays > 0, "Lock duration must be > 0");
        require(apr <= 50000, "APR too high");
        lockConfigs.push(LockConfig(lockDays * 1 days, apr, true));
        emit LockConfigAdded(lockConfigs.length - 1, lockDays * 1 days, apr);
    }

    function updateLockConfig(uint256 id, uint256 apr, bool active) external onlyOwner {
        require(id < lockConfigs.length, "Invalid config id");
        require(apr <= 50000, "APR too high");
        lockConfigs[id].apr = apr;
        lockConfigs[id].active = active;
        emit LockConfigUpdated(id, apr, active);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    /* ================= REWARD TIER ADMIN ================= */

    function addRewardTier(
        uint256 minNilaAmount,
        uint256 maxNilaAmount,
        uint256 instantRewardBps
    ) external onlyOwner {
        require(instantRewardBps <= BPS, "Invalid reward bps");
        require(maxNilaAmount == 0 || maxNilaAmount > minNilaAmount, "Invalid range");
        
        rewardTiers.push(RewardTier({
            minNilaAmount: minNilaAmount,
            maxNilaAmount: maxNilaAmount,
            instantRewardBps: instantRewardBps,
            active: true
        }));
        
        emit RewardTierAdded(rewardTiers.length - 1, minNilaAmount, maxNilaAmount, instantRewardBps);
    }

    function updateRewardTier(
        uint256 id,
        uint256 minNilaAmount,
        uint256 maxNilaAmount,
        uint256 instantRewardBps,
        bool active
    ) external onlyOwner {
        require(id < rewardTiers.length, "Invalid tier id");
        require(instantRewardBps <= BPS, "Invalid reward bps");
        require(maxNilaAmount == 0 || maxNilaAmount > minNilaAmount, "Invalid range");
        
        rewardTiers[id].minNilaAmount = minNilaAmount;
        rewardTiers[id].maxNilaAmount = maxNilaAmount;
        rewardTiers[id].instantRewardBps = instantRewardBps;
        rewardTiers[id].active = active;
        
        emit RewardTierUpdated(id, minNilaAmount, maxNilaAmount, instantRewardBps, active);
    }

    function _getInstantRewardBps(uint256 nilaAmount) internal view returns (uint256) {
        for (uint256 i = 0; i < rewardTiers.length; i++) {
            RewardTier memory tier = rewardTiers[i];
            if (!tier.active) continue;
            
            bool aboveMin = nilaAmount >= tier.minNilaAmount;
            bool belowMax = tier.maxNilaAmount == 0 || nilaAmount <= tier.maxNilaAmount;
            
            if (aboveMin && belowMax) {
                return tier.instantRewardBps;
            }
        }
        return 0; // No tier found, no instant reward
    }

    /* ================= REFERRAL ADMIN ================= */

    function setReferralConfig(
        uint256 referralPercentageBps,
        uint256 referrerPercentageBps,
        bool isPaused
    ) external onlyOwner {
        require(referralPercentageBps <= BPS, "Invalid referral percentage");
        require(referrerPercentageBps <= BPS, "Invalid referrer percentage");
        
        referralConfig.referralPercentageBps = referralPercentageBps;
        referralConfig.referrerPercentageBps = referrerPercentageBps;
        referralConfig.isPaused = isPaused;
        
        emit ReferralConfigUpdated(referralPercentageBps, referrerPercentageBps, isPaused);
    }

    /* ================= SAFE WITHDRAWALS ================= */

    function recoverERC20(address token, uint256 amount) external onlyOwner {
        require(token != address(nila), "Cannot recover staking token");
        IERC20(token).transfer(owner(), amount);
        emit ERC20Recovered(token, amount);
    }

    function withdrawExcessRewards(uint256 amount) external onlyOwner {
        require(paused(), "Contract must be paused");
        uint256 excess = availableRewards();
        require(amount <= excess, "Amount exceeds reward pool");
        nila.transfer(owner(), amount);
        emit ExcessRewardsWithdrawn(owner(), amount);
    }

    /* ================= ADMIN STAKE CREATION ================= */

    /**
     * @notice Admin function to manually create a stake without token transfer
     * @dev Used for manual stake assignments by admin panel
     * @dev Admin-created stakes do NOT receive instant rewards or referral rewards
     * @param user The address to create the stake for
     * @param amount The stake amount (in wei)
     * @param lockDays The lock duration in days
     * @param apr The APR in basis points (e.g., 1000 = 10%)
     */
    function adminCreateStake(
        address user,
        uint256 amount,
        uint256 lockDays,
        uint256 apr
    ) external onlyOwner nonReentrant {
        require(user != address(0), "Invalid user");
        require(amount > 0, "Invalid amount");
        require(lockDays > 0, "Invalid lock days");
        require(apr <= 50000, "APR too high");
        require(activeStakeCount[user] < MAX_STAKES_PER_USER, "Too many active stakes");

        // Track unique stakers
        if (!hasStaked[user]) {
            hasStaked[user] = true;
            uniqueStakers++;
        }

        // Create stake record (without token transfer and without instant rewards)
        uint256 stakeId = userStakes[user].length;
        uint256 lockDuration = lockDays * 1 days;
        
        userStakes[user].push(
            StakeInfo({
                amount: amount,
                startTime: block.timestamp,
                lastClaimTime: block.timestamp,
                unlockTime: block.timestamp + lockDuration,
                aprSnapshot: apr,
                instantRewardSnapshot: 0, // No instant rewards for admin stakes
                unstaked: false
            })
        );

        activeStakeCount[user]++;
        
        // Note: totalStaked is NOT incremented because no tokens were transferred
        
        emit Staked(user, stakeId, amount, 0);
    }

    /**
     * @notice Backend function to create stake after token purchase
     * @dev Called by Nila-LatestFiles backend after user pays with USDT/BNB/ETH/TRX
     * @dev Backend must transfer NILA to contract BEFORE calling this function
     * @dev Provides tier-based instant rewards and referral rewards
     * @param user The address who will own the stake
     * @param nilaAmount The NILA amount (already transferred to contract)
     * @param lockDays The lock duration in days
     * @param apr The APR in basis points
     * @param referrer Optional referrer address (address(0) if none)
     */
    function buyWithToken(
        address user,
        uint256 nilaAmount,
        uint256 lockDays,
        uint256 apr,
        address referrer
    ) external onlyOwner nonReentrant whenNotPaused {
        require(user != address(0), "Invalid user");
        require(nilaAmount > 0, "Invalid amount");
        require(lockDays > 0, "Invalid lock days");
        require(apr <= 50000, "APR too high");
        require(activeStakeCount[user] < MAX_STAKES_PER_USER, "Too many active stakes");

        // Calculate tier-based instant reward
        uint256 instantRewardBps = _getInstantRewardBps(nilaAmount);
        uint256 instantReward = (nilaAmount * instantRewardBps) / BPS;

        // Verify contract has enough NILA for instant rewards
        if (instantReward > 0) {
            require(availableRewards() >= instantReward, "Insufficient reward pool");
            claimableInstantRewards[user] += instantReward;
        }

        // Handle referral rewards
        if (referrer != address(0) && referrer != user && !referralConfig.isPaused && referrers[user] == address(0)) {
            referrers[user] = referrer;
            referralCount[referrer]++;
            
            uint256 referralReward = (nilaAmount * referralConfig.referralPercentageBps) / BPS;
            uint256 referrerBonus = (nilaAmount * referralConfig.referrerPercentageBps) / BPS;
            
            uint256 totalReferralReward = referralReward + referrerBonus;
            
            require(availableRewards() >= instantReward + totalReferralReward, "Insufficient reward pool for referrals");
            
            if (referralReward > 0) {
                claimableReferralRewards[referrer] += referralReward;
                referralEarnings[referrer] += referralReward;
            }
            
            if (referrerBonus > 0) {
                claimableReferralRewards[user] += referrerBonus;
            }
            
            emit ReferralRegistered(referrer, user);
        }

        // Track unique stakers
        if (!hasStaked[user]) {
            hasStaked[user] = true;
            uniqueStakers++;
        }

        // Create stake record
        uint256 stakeId = userStakes[user].length;
        uint256 lockDuration = lockDays * 1 days;
        
        userStakes[user].push(
            StakeInfo({
                amount: nilaAmount,
                startTime: block.timestamp,
                lastClaimTime: block.timestamp,
                unlockTime: block.timestamp + lockDuration,
                aprSnapshot: apr,
                instantRewardSnapshot: instantReward,
                unstaked: false
            })
        );

        activeStakeCount[user]++;
        totalStaked += nilaAmount;
        
        emit TokenPurchaseStaked(user, stakeId, nilaAmount, instantReward);
        emit Staked(user, stakeId, nilaAmount, 0);
    }

    /* ================= USER STAKING ================= */

    /**
     * @notice Stake any amount of NILA tokens for a specified lock period
     * @dev Direct staking does NOT provide instant rewards or referral rewards (only Buy & Stake does)
     * @param amount The amount of NILA tokens to stake (must be >= MIN_STAKE_AMOUNT)
     * @param lockId The ID of the lock configuration to use
     */
    function stake(uint256 amount, uint256 lockId) external nonReentrant whenNotPaused {
        _stakeFlexible(amount, lockId);
    }

    /**
     * @dev Internal function for flexible amount staking (no instant rewards, no referral rewards)
     */
    function _stakeFlexible(uint256 amount, uint256 lockId) internal {
        require(amount >= MIN_STAKE_AMOUNT, "Amount below minimum");
        require(lockId < lockConfigs.length, "Invalid lockId");
        require(activeStakeCount[msg.sender] < MAX_STAKES_PER_USER, "Too many active stakes");

        LockConfig memory l = lockConfigs[lockId];
        require(l.active, "Inactive lock config");

        // Transfer tokens from user
        nila.transferFrom(msg.sender, address(this), amount);
        totalStaked += amount;

        // Track unique stakers
        if (!hasStaked[msg.sender]) {
            hasStaked[msg.sender] = true;
            uniqueStakers++;
        }

        // Create stake record (NO instant rewards, NO referral rewards for direct staking)
        uint256 stakeId = userStakes[msg.sender].length;
        userStakes[msg.sender].push(
            StakeInfo({
                amount: amount,
                startTime: block.timestamp,
                lastClaimTime: block.timestamp,
                unlockTime: block.timestamp + l.lockDuration,
                aprSnapshot: l.apr,
                instantRewardSnapshot: 0, // No instant rewards for direct staking
                unstaked: false
            })
        );

        activeStakeCount[msg.sender]++;
        emit Staked(msg.sender, stakeId, amount, lockId);
    }

    /* ================= CLAIM FUNCTIONS ================= */

    function claim(uint256 index) external nonReentrant {
        _validateIndex(msg.sender, index);
        StakeInfo storage s = userStakes[msg.sender][index];
        require(!s.unstaked, "Already unstaked");
        require(block.timestamp >= s.lastClaimTime + CLAIM_INTERVAL, "Claim every 30 days");

        uint256 reward = pendingReward(msg.sender, index);
        require(reward > 0, "No rewards");
        require(availableRewards() >= reward, "Insufficient reward pool");

        s.lastClaimTime = block.timestamp;
        nila.transfer(msg.sender, reward);
        emit RewardClaimed(msg.sender, index, reward);
    }

    function claimInstantRewards() external nonReentrant {
        uint256 amount = claimableInstantRewards[msg.sender];
        require(amount > 0, "No instant rewards to claim");
        require(availableRewards() >= amount, "Insufficient reward pool");

        claimableInstantRewards[msg.sender] = 0;
        nila.transfer(msg.sender, amount);
        emit InstantRewardClaimed(msg.sender, 0, amount);
    }

    function claimReferralRewards() external nonReentrant {
        uint256 amount = claimableReferralRewards[msg.sender];
        require(amount > 0, "No referral rewards to claim");
        require(availableRewards() >= amount, "Insufficient reward pool");

        claimableReferralRewards[msg.sender] = 0;
        nila.transfer(msg.sender, amount);
        emit ReferralBonusClaimed(msg.sender, amount);
    }

    function claimAllRewards() external nonReentrant {
        uint256 instantAmount = claimableInstantRewards[msg.sender];
        uint256 referralAmount = claimableReferralRewards[msg.sender];
        uint256 apyAmount = 0;
        
        StakeInfo[] storage stakes = userStakes[msg.sender];
        
        for (uint256 i = 0; i < stakes.length; i++) {
            StakeInfo storage s = stakes[i];
            
            if (!s.unstaked && block.timestamp >= s.lastClaimTime + CLAIM_INTERVAL) {
                uint256 reward = pendingReward(msg.sender, i);
                
                if (reward > 0) {
                    s.lastClaimTime = block.timestamp;
                    apyAmount += reward;
                    emit RewardClaimed(msg.sender, i, reward);
                }
            }
        }
        
        uint256 totalAmount = instantAmount + referralAmount + apyAmount;
        
        require(totalAmount > 0, "No rewards to claim");
        require(availableRewards() >= totalAmount, "Insufficient reward pool");

        if (instantAmount > 0) {
            claimableInstantRewards[msg.sender] = 0;
            emit InstantRewardClaimed(msg.sender, 0, instantAmount);
        }

        if (referralAmount > 0) {
            claimableReferralRewards[msg.sender] = 0;
            emit ReferralBonusClaimed(msg.sender, referralAmount);
        }

        nila.transfer(msg.sender, totalAmount);
    }

    function claimAllAPYRewards() external nonReentrant {
        StakeInfo[] storage stakes = userStakes[msg.sender];
        require(stakes.length > 0, "No stakes found");

        uint256 totalReward = 0;
        uint256 claimedCount = 0;

        for (uint256 i = 0; i < stakes.length; i++) {
            StakeInfo storage s = stakes[i];
            
            if (!s.unstaked && block.timestamp >= s.lastClaimTime + CLAIM_INTERVAL) {
                uint256 reward = pendingReward(msg.sender, i);
                
                if (reward > 0) {
                    s.lastClaimTime = block.timestamp;
                    totalReward += reward;
                    claimedCount++;
                    emit RewardClaimed(msg.sender, i, reward);
                }
            }
        }

        require(totalReward > 0, "No APY rewards to claim");
        require(availableRewards() >= totalReward, "Insufficient reward pool");

        nila.transfer(msg.sender, totalReward);
    }

    function unstake(uint256 index) external nonReentrant {
        _validateIndex(msg.sender, index);
        StakeInfo storage s = userStakes[msg.sender][index];
        require(!s.unstaked, "Already unstaked");
        require(block.timestamp >= s.unlockTime, "Lock active");

        uint256 reward = pendingReward(msg.sender, index);
        if (reward > 0) {
            require(availableRewards() >= reward, "Insufficient reward pool");
            nila.transfer(msg.sender, reward);
            emit RewardClaimed(msg.sender, index, reward);
        }

        s.unstaked = true;
        totalStaked -= s.amount;
        activeStakeCount[msg.sender]--;

        nila.transfer(msg.sender, s.amount);
        emit Unstaked(msg.sender, index, s.amount);
    }

    function emergencyUnstake(uint256 index) external nonReentrant {
        require(paused(), "Only when paused");
        _validateIndex(msg.sender, index);
        StakeInfo storage s = userStakes[msg.sender][index];
        require(!s.unstaked, "Already unstaked");

        s.unstaked = true;
        s.lastClaimTime = block.timestamp;
        totalStaked -= s.amount;
        activeStakeCount[msg.sender]--;

        nila.transfer(msg.sender, s.amount);
        emit EmergencyUnstaked(msg.sender, index, s.amount);
    }

    /* ================= VIEW ================= */

    function pendingReward(address user, uint256 index) public view returns (uint256) {
        if (index >= userStakes[user].length) return 0;
        StakeInfo memory s = userStakes[user][index];
        if (s.unstaked) return 0;

        uint256 timeDiff = block.timestamp - s.lastClaimTime;
        return (s.amount * s.aprSnapshot * timeDiff) / (BPS * 365 days);
    }

    function getUserStakes(address user) external view returns (StakeInfo[] memory) {
        return userStakes[user];
    }

    function getUserStakeCount(address user) external view returns (uint256) {
        return userStakes[user].length;
    }

    function getUserActiveStakeCount(address user) external view returns (uint256) {
        return activeStakeCount[user];
    }

    function getAmountConfigCount() external view returns (uint256) {
        return amountConfigs.length;
    }

    function getLockConfigCount() external view returns (uint256) {
        return lockConfigs.length;
    }

    function getStakerCount() external view returns (uint256) {
        return uniqueStakers;
    }

    function hasActiveStakes(address user) external view returns (bool) {
        return activeStakeCount[user] > 0;
    }

    function getStakeDetails(address user, uint256 index)
        external
        view
        returns (StakeDetails memory details)
    {
        require(index < userStakes[user].length, "Invalid index");
        StakeInfo storage s = userStakes[user][index];

        details.amount = s.amount;
        details.startTime = s.startTime;
        details.lastClaimTime = s.lastClaimTime;
        details.unlockTime = s.unlockTime;
        details.apr = s.aprSnapshot;
        details.instantReward = s.instantRewardSnapshot;
        details.unstaked = s.unstaked;
        details.pendingRewards = pendingReward(user, index);
        details.canClaim = !s.unstaked && block.timestamp >= s.lastClaimTime + CLAIM_INTERVAL;
        details.canUnstake = !s.unstaked && block.timestamp >= s.unlockTime;
    }

    function getUserTotals(address user)
        external
        view
        returns (
            uint256 totalLocked,
            uint256 totalPendingRewards,
            uint256 totalInstantRewardsReceived
        )
    {
        StakeInfo[] memory stakes = userStakes[user];
        for (uint256 i = 0; i < stakes.length; i++) {
            if (!stakes[i].unstaked) {
                totalLocked += stakes[i].amount;
                totalPendingRewards += pendingReward(user, i);
            }
            totalInstantRewardsReceived += stakes[i].instantRewardSnapshot;
        }
    }

    function getTotalPendingAPYRewards(address user) external view returns (uint256) {
        StakeInfo[] memory stakes = userStakes[user];
        uint256 total = 0;
        
        for (uint256 i = 0; i < stakes.length; i++) {
            if (!stakes[i].unstaked) {
                total += pendingReward(user, i);
            }
        }
        
        return total;
    }

    function getReferralConfig() external view returns (
        uint256 referralPercentageBps,
        uint256 referrerPercentageBps,
        bool isPaused
    ) {
        return (
            referralConfig.referralPercentageBps,
            referralConfig.referrerPercentageBps,
            referralConfig.isPaused
        );
    }

    function getReferralStats(address user) external view returns (
        address referrer,
        uint256 referralsMade,
        uint256 totalEarnings
    ) {
        return (
            referrers[user],
            referralCount[user],
            referralEarnings[user]
        );
    }

    function hasReferrer(address user) external view returns (bool) {
        return referrers[user] != address(0);
    }

    function getClaimableRewards(address user) external view returns (
        uint256 instantRewards,
        uint256 referralRewards,
        uint256 totalClaimable
    ) {
        instantRewards = claimableInstantRewards[user];
        referralRewards = claimableReferralRewards[user];
        totalClaimable = instantRewards + referralRewards;
    }

    function getRewardTierCount() external view returns (uint256) {
        return rewardTiers.length;
    }

    function getRewardTier(uint256 id) external view returns (
        uint256 minNilaAmount,
        uint256 maxNilaAmount,
        uint256 instantRewardBps,
        bool active
    ) {
        require(id < rewardTiers.length, "Invalid tier id");
        RewardTier memory tier = rewardTiers[id];
        return (tier.minNilaAmount, tier.maxNilaAmount, tier.instantRewardBps, tier.active);
    }

    function calculateInstantReward(uint256 nilaAmount) external view returns (uint256) {
        uint256 bps = _getInstantRewardBps(nilaAmount);
        return (nilaAmount * bps) / BPS;
    }

    function version() external pure virtual returns (string memory) {
        return "3.0.0";
    }

    /**
     * @dev Storage gap for future upgrades
     * Reserves storage slots to allow adding new state variables in future upgrades
     */
    uint256[50] private __gap;
}
