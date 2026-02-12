// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NilaStaking is ReentrancyGuard, Pausable, Ownable {
    IERC20 public immutable nila;

    uint256 public constant BPS = 10_000;
    uint256 public constant CLAIM_INTERVAL = 30 days;
    uint256 public constant MAX_STAKES_PER_USER = 100;

    /* ================= GLOBAL ACCOUNTING ================= */
    uint256 public totalStaked;
    uint256 public uniqueStakers;
    mapping(address => bool) private hasStaked;

    /* ================= CONFIG STRUCTS ================= */
    struct AmountConfig {
        uint256 amount;
        uint256 instantRewardBps;
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
        uint256 referralPercentageBps;  // Commission for referrer (in basis points)
        uint256 referrerPercentageBps;  // Bonus for referred user (in basis points)
        bool isPaused;
    }

    AmountConfig[] public amountConfigs;
    LockConfig[] public lockConfigs;
    mapping(address => StakeInfo[]) private userStakes;
    mapping(address => uint256) public activeStakeCount;

    /* ================= REFERRAL SYSTEM ================= */
    ReferralConfig public referralConfig;
    mapping(address => address) public referrers; // referred => referrer
    mapping(address => uint256) public referralCount; // referrer => count
    mapping(address => uint256) public referralEarnings; // referrer => total earnings

    /* ================= EVENTS ================= */
    event AmountConfigAdded(uint256 indexed id, uint256 amount, uint256 instantRewardBps);
    event AmountConfigUpdated(uint256 indexed id, uint256 instantRewardBps, bool active);
    event LockConfigAdded(uint256 indexed id, uint256 lockDuration, uint256 apr);
    event LockConfigUpdated(uint256 indexed id, uint256 apr, bool active);
    event Staked(address indexed user, uint256 indexed stakeId, uint256 amount, uint256 lockId);
    event RewardClaimed(address indexed user, uint256 indexed stakeId, uint256 reward);
    event Unstaked(address indexed user, uint256 indexed stakeId, uint256 amount);
    event EmergencyUnstaked(address indexed user, uint256 indexed stakeId, uint256 amount);
    event RewardFunded(address indexed from, uint256 amount);
    event ExcessRewardsWithdrawn(address indexed owner, uint256 amount);
    event ERC20Recovered(address indexed token, uint256 amount);
    
    // Referral Events
    event ReferralConfigUpdated(uint256 referralPercentageBps, uint256 referrerPercentageBps, bool isPaused);
    event ReferralRegistered(address indexed referrer, address indexed referred);
    event ReferralRewardPaid(address indexed referrer, address indexed referred, uint256 amount);

    constructor(address _nila) Ownable(msg.sender) {
        require(_nila != address(0), "Invalid token");
        nila = IERC20(_nila);
        
        // Initialize referral config with default values (5% referral, 2% referrer bonus)
        referralConfig = ReferralConfig({
            referralPercentageBps: 500,  // 5%
            referrerPercentageBps: 200,  // 2%
            isPaused: false
        });
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

    function addAmountConfig(uint256 amount, uint256 instantRewardBps) external onlyOwner {
        require(amount > 0, "Invalid amount");
        require(instantRewardBps <= BPS, "Invalid reward bps");
        amountConfigs.push(AmountConfig(amount, instantRewardBps, true));
        emit AmountConfigAdded(amountConfigs.length - 1, amount, instantRewardBps);
    }

    function updateAmountConfig(uint256 id, uint256 instantRewardBps, bool active) external onlyOwner {
        require(id < amountConfigs.length, "Invalid config id");
        require(instantRewardBps <= BPS, "Invalid reward bps");
        amountConfigs[id].instantRewardBps = instantRewardBps;
        amountConfigs[id].active = active;
        emit AmountConfigUpdated(id, instantRewardBps, active);
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

    function notifyRewardDeposit(uint256 amount) external {
        require(amount > 0, "Zero amount");
        emit RewardFunded(msg.sender, amount);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

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

    function setReferralPercentage(uint256 percentage) external onlyOwner {
        require(percentage <= BPS, "Invalid percentage");
        referralConfig.referralPercentageBps = percentage;
        emit ReferralConfigUpdated(
            referralConfig.referralPercentageBps,
            referralConfig.referrerPercentageBps,
            referralConfig.isPaused
        );
    }

    function setReferrerPercentage(uint256 percentage) external onlyOwner {
        require(percentage <= BPS, "Invalid percentage");
        referralConfig.referrerPercentageBps = percentage;
        emit ReferralConfigUpdated(
            referralConfig.referralPercentageBps,
            referralConfig.referrerPercentageBps,
            referralConfig.isPaused
        );
    }

    function pauseReferrals() external onlyOwner {
        referralConfig.isPaused = true;
        emit ReferralConfigUpdated(
            referralConfig.referralPercentageBps,
            referralConfig.referrerPercentageBps,
            true
        );
    }

    function unpauseReferrals() external onlyOwner {
        referralConfig.isPaused = false;
        emit ReferralConfigUpdated(
            referralConfig.referralPercentageBps,
            referralConfig.referrerPercentageBps,
            false
        );
    }

    /* ================= SAFE WITHDRAWALS ================= */

    // Recover tokens accidentally sent (NOT NILA)
    function recoverERC20(address token, uint256 amount) external onlyOwner {
        require(token != address(nila), "Cannot recover staking token");
        IERC20(token).transfer(owner(), amount);
        emit ERC20Recovered(token, amount);
    }

    // Withdraw ONLY unused reward NILA (principal is protected)
    function withdrawExcessRewards(uint256 amount) external onlyOwner {
        require(paused(), "Contract must be paused");
        uint256 excess = availableRewards();
        require(amount <= excess, "Amount exceeds reward pool");
        nila.transfer(owner(), amount);
        emit ExcessRewardsWithdrawn(owner(), amount);
    }

    /* ================= USER ================= */

    function stake(uint256 amountId, uint256 lockId) external nonReentrant whenNotPaused {
        _stake(amountId, lockId, address(0));
    }

    function stakeWithReferral(uint256 amountId, uint256 lockId, address referrer) external nonReentrant whenNotPaused {
        require(referrer != address(0), "Invalid referrer");
        require(referrer != msg.sender, "Cannot refer yourself");
        _stake(amountId, lockId, referrer);
    }

    function _stake(uint256 amountId, uint256 lockId, address referrer) internal {
        require(amountId < amountConfigs.length, "Invalid amountId");
        require(lockId < lockConfigs.length, "Invalid lockId");
        require(activeStakeCount[msg.sender] < MAX_STAKES_PER_USER, "Too many active stakes");

        AmountConfig memory a = amountConfigs[amountId];
        LockConfig memory l = lockConfigs[lockId];
        require(a.active && l.active, "Inactive config");

        uint256 instantReward = (a.amount * a.instantRewardBps) / BPS;

        nila.transferFrom(msg.sender, address(this), a.amount);
        totalStaked += a.amount;

        require(availableRewards() >= instantReward, "Insufficient reward pool");

        if (instantReward > 0) {
            nila.transfer(msg.sender, instantReward);
        }

        // Handle referral logic
        if (referrer != address(0) && !referralConfig.isPaused && referrers[msg.sender] == address(0)) {
            referrers[msg.sender] = referrer;
            referralCount[referrer]++;
            
            // Calculate and pay referral rewards
            uint256 referralReward = (a.amount * referralConfig.referralPercentageBps) / BPS;
            uint256 referrerBonus = (a.amount * referralConfig.referrerPercentageBps) / BPS;
            
            uint256 totalReferralReward = referralReward + referrerBonus;
            
            if (totalReferralReward > 0 && availableRewards() >= totalReferralReward) {
                // Pay referrer commission
                if (referralReward > 0) {
                    nila.transfer(referrer, referralReward);
                    referralEarnings[referrer] += referralReward;
                }
                
                // Pay referred user bonus
                if (referrerBonus > 0) {
                    nila.transfer(msg.sender, referrerBonus);
                }
                
                emit ReferralRegistered(referrer, msg.sender);
                emit ReferralRewardPaid(referrer, msg.sender, referralReward);
            }
        }

        if (!hasStaked[msg.sender]) {
            hasStaked[msg.sender] = true;
            uniqueStakers++;
        }

        uint256 stakeId = userStakes[msg.sender].length;
        userStakes[msg.sender].push(
            StakeInfo(
                a.amount,
                block.timestamp,
                block.timestamp,
                block.timestamp + l.lockDuration,
                l.apr,
                instantReward,
                false
            )
        );

        activeStakeCount[msg.sender]++;
        emit Staked(msg.sender, stakeId, a.amount, lockId);
    }

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
        returns (
            uint256 amount,
            uint256 startTime,
            uint256 lastClaimTime,
            uint256 unlockTime,
            uint256 apr,
            uint256 instantReward,
            bool unstaked,
            uint256 pendingRewards,
            bool canClaim,
            bool canUnstake
        )
    {
        require(index < userStakes[user].length, "Invalid index");
        StakeInfo memory s = userStakes[user][index];

        return (
            s.amount,
            s.startTime,
            s.lastClaimTime,
            s.unlockTime,
            s.aprSnapshot,
            s.instantRewardSnapshot,
            s.unstaked,
            pendingReward(user, index),
            !s.unstaked && block.timestamp >= s.lastClaimTime + CLAIM_INTERVAL,
            !s.unstaked && block.timestamp >= s.unlockTime
        );
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

    /* ================= REFERRAL VIEW ================= */

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
}
