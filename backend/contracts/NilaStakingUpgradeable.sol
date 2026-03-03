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
    IERC20 public usdt;

    uint256 public constant BPS = 10_000;
    uint256 public constant CLAIM_INTERVAL = 30 days;
    uint256 public constant MAX_STAKES_PER_USER = 100;
    uint256 public constant MIN_STAKE_AMOUNT = 100 * 10**18; // 100 NILA minimum
    uint256 public constant NILA_PRICE_USDT = 8 * 10**16; // 0.08 USDT (18 decimals)
    uint256 public constant MIN_USDT_PURCHASE = 10 * 10**18; // 10 USDT minimum

    /* ================= GLOBAL ACCOUNTING ================= */
    uint256 public totalStaked;
    uint256 public uniqueStakers;
    mapping(address => bool) private hasStaked;
    
    /* ================= USDT STAKING ACCOUNTING ================= */
    uint256 public totalNilaLiabilities; // Total NILA recorded but not yet distributed
    uint256 public totalUsdtCollected; // Total USDT collected from purchases

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
        uint256 usdtPaid;
        uint256 startTime;
        uint256 lastClaimTime;
        uint256 unlockTime;
        uint256 aprSnapshot;
        uint256 instantRewardSnapshot;
        bool unstaked;
        bool isUsdtStake;
    }

    struct ReferralConfig {
        uint256 referralPercentageBps;
        uint256 referrerPercentageBps;
        bool isPaused;
    }

    struct StakeDetails {
        uint256 amount;
        uint256 usdtPaid;
        uint256 startTime;
        uint256 lastClaimTime;
        uint256 unlockTime;
        uint256 apr;
        uint256 instantReward;
        bool unstaked;
        bool isUsdtStake;
        uint256 pendingRewards;
        bool canClaim;
        bool canUnstake;
    }

    AmountConfig[] public amountConfigs;
    LockConfig[] public lockConfigs;
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
    mapping(address => uint256) public claimableInstantRewardsUSDT;
    mapping(address => uint256) public claimableReferralRewardsUSDT;

    /* ================= EVENTS ================= */
    event AmountConfigAdded(uint256 indexed id, uint256 amount, uint256 instantRewardBps);
    event AmountConfigUpdated(uint256 indexed id, uint256 instantRewardBps, bool active);
    event LockConfigAdded(uint256 indexed id, uint256 lockDuration, uint256 apr);
    event LockConfigUpdated(uint256 indexed id, uint256 apr, bool active);
    event Staked(address indexed user, uint256 indexed stakeId, uint256 amount, uint256 lockId);
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
    event USDTStakeCreated(address indexed user, uint256 indexed stakeId, uint256 usdtPaid, uint256 nilaRecorded);
    event NILADepositedForLiabilities(address indexed admin, uint256 amount);
    event USDTWithdrawn(address indexed admin, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _nila, address _usdt) public initializer {
        require(_nila != address(0), "Invalid NILA token");
        require(_usdt != address(0), "Invalid USDT token");
        
        __ReentrancyGuard_init();
        __Pausable_init();
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        
        nila = IERC20(_nila);
        usdt = IERC20(_usdt);
        
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
     * Admin function to manually create a stake without token transfer
     * Used for manual stake assignments, off-chain payments, or special cases
     * Note: This creates a liability - tokens must be deposited to cover rewards
     * Admin-created stakes do NOT receive instant rewards
     * 
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
            StakeInfo(
                amount,
                0,
                block.timestamp,
                block.timestamp,
                block.timestamp + lockDuration,
                apr,
                0, // No instant rewards for admin-created stakes
                false,
                false
            )
        );

        activeStakeCount[user]++;
        
        // Note: totalStaked is NOT incremented because no tokens were actually transferred
        // This keeps the contract's token accounting accurate
        
        emit Staked(user, stakeId, amount, 0); // lockId = 0 for manual stakes
    }

    /* ================= USER STAKING ================= */

    /**
     * @notice Stake any amount of NILA tokens for a specified lock period
     * @dev Direct staking does NOT provide instant rewards (only Buy & Stake does)
     * @param amount The amount of NILA tokens to stake (must be >= MIN_STAKE_AMOUNT)
     * @param lockId The ID of the lock configuration to use
     */
    function stake(uint256 amount, uint256 lockId) external nonReentrant whenNotPaused {
        _stakeFlexible(amount, lockId, address(0));
    }

    /**
     * @notice Stake any amount of NILA tokens with a referrer
     * @dev Direct staking does NOT provide instant rewards (only Buy & Stake does)
     * @param amount The amount of NILA tokens to stake (must be >= MIN_STAKE_AMOUNT)
     * @param lockId The ID of the lock configuration to use
     * @param referrer The address of the referrer
     */
    function stakeWithReferral(uint256 amount, uint256 lockId, address referrer) external nonReentrant whenNotPaused {
        require(referrer != address(0), "Invalid referrer");
        require(referrer != msg.sender, "Cannot refer yourself");
        _stakeFlexible(amount, lockId, referrer);
    }

    /**
     * @dev Internal function for flexible amount staking (no instant rewards)
     */
    function _stakeFlexible(uint256 amount, uint256 lockId, address referrer) internal {
        require(amount >= MIN_STAKE_AMOUNT, "Amount below minimum");
        require(lockId < lockConfigs.length, "Invalid lockId");
        require(activeStakeCount[msg.sender] < MAX_STAKES_PER_USER, "Too many active stakes");

        LockConfig memory l = lockConfigs[lockId];
        require(l.active, "Inactive lock config");

        // Transfer tokens from user
        nila.transferFrom(msg.sender, address(this), amount);
        totalStaked += amount;

        // Handle referral rewards (if applicable)
        if (referrer != address(0) && !referralConfig.isPaused && referrers[msg.sender] == address(0)) {
            referrers[msg.sender] = referrer;
            referralCount[referrer]++;
            
            uint256 referralReward = (amount * referralConfig.referralPercentageBps) / BPS;
            uint256 referrerBonus = (amount * referralConfig.referrerPercentageBps) / BPS;
            
            uint256 totalReferralReward = referralReward + referrerBonus;
            
            require(availableRewards() >= totalReferralReward, "Insufficient reward pool for referrals");
            
            if (referralReward > 0) {
                claimableReferralRewards[referrer] += referralReward;
                referralEarnings[referrer] += referralReward;
            }
            
            if (referrerBonus > 0) {
                claimableReferralRewards[msg.sender] += referrerBonus;
            }
            
            emit ReferralRegistered(referrer, msg.sender);
        }

        // Track unique stakers
        if (!hasStaked[msg.sender]) {
            hasStaked[msg.sender] = true;
            uniqueStakers++;
        }

        // Create stake record (NO instant rewards for direct staking)
        uint256 stakeId = userStakes[msg.sender].length;
        userStakes[msg.sender].push(
            StakeInfo(
                amount,
                0,
                block.timestamp,
                block.timestamp,
                block.timestamp + l.lockDuration,
                l.apr,
                0, // No instant rewards for direct staking
                false,
                false
            )
        );

        activeStakeCount[msg.sender]++;
        emit Staked(msg.sender, stakeId, amount, lockId);
    }

    /* ================= BUY & STAKE (with instant rewards) ================= */

    /**
     * @notice Stake using predefined amount configs (for Buy & Stake feature)
     * @dev This function provides instant rewards based on amount config
     * @param amountId The ID of the amount configuration
     * @param lockId The ID of the lock configuration
     */
    function stakeWithAmountConfig(uint256 amountId, uint256 lockId) external nonReentrant whenNotPaused {
        _stakeWithConfig(amountId, lockId, address(0));
    }

    /**
     * @notice Stake using predefined amount configs with referrer (for Buy & Stake feature)
     * @dev This function provides instant rewards based on amount config
     * @param amountId The ID of the amount configuration
     * @param lockId The ID of the lock configuration
     * @param referrer The address of the referrer
     */
    function stakeWithAmountConfigAndReferral(uint256 amountId, uint256 lockId, address referrer) external nonReentrant whenNotPaused {
        require(referrer != address(0), "Invalid referrer");
        require(referrer != msg.sender, "Cannot refer yourself");
        _stakeWithConfig(amountId, lockId, referrer);
    }

    /**
     * @dev Internal function for config-based staking (with instant rewards)
     * This is used for Buy & Stake feature only
     */
    function _stakeWithConfig(uint256 amountId, uint256 lockId, address referrer) internal {
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
            claimableInstantRewards[msg.sender] += instantReward;
        }

        if (referrer != address(0) && !referralConfig.isPaused && referrers[msg.sender] == address(0)) {
            referrers[msg.sender] = referrer;
            referralCount[referrer]++;
            
            uint256 referralReward = (a.amount * referralConfig.referralPercentageBps) / BPS;
            uint256 referrerBonus = (a.amount * referralConfig.referrerPercentageBps) / BPS;
            
            uint256 totalReferralReward = referralReward + referrerBonus;
            
            require(availableRewards() >= instantReward + totalReferralReward, "Insufficient reward pool for referrals");
            
            if (referralReward > 0) {
                claimableReferralRewards[referrer] += referralReward;
                referralEarnings[referrer] += referralReward;
            }
            
            if (referrerBonus > 0) {
                claimableReferralRewards[msg.sender] += referrerBonus;
            }
            
            emit ReferralRegistered(referrer, msg.sender);
        }

        if (!hasStaked[msg.sender]) {
            hasStaked[msg.sender] = true;
            uniqueStakers++;
        }

        uint256 stakeId = userStakes[msg.sender].length;
        userStakes[msg.sender].push(
            StakeInfo(
                a.amount,
                0,
                block.timestamp,
                block.timestamp,
                block.timestamp + l.lockDuration,
                l.apr,
                instantReward,
                false,
                false
            )
        );

        activeStakeCount[msg.sender]++;
        emit Staked(msg.sender, stakeId, a.amount, lockId);
    }

    /* ================= USDT PURCHASE & STAKE ================= */

    /**
     * @notice Buy NILA with USDT and stake (with instant rewards in USDT)
     * @param usdtAmount Amount of USDT to spend (must be >= 10 USDT)
     * @param lockId Lock configuration ID
     */
    function buyAndStakeWithUSDT(uint256 usdtAmount, uint256 lockId) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        _buyAndStakeWithUSDT(usdtAmount, lockId, address(0));
    }

    /**
     * @notice Buy NILA with USDT and stake with referrer
     * @param usdtAmount Amount of USDT to spend
     * @param lockId Lock configuration ID
     * @param referrer Referrer address
     */
    function buyAndStakeWithUSDTAndReferral(
        uint256 usdtAmount, 
        uint256 lockId, 
        address referrer
    ) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        require(referrer != address(0), "Invalid referrer");
        require(referrer != msg.sender, "Cannot refer yourself");
        _buyAndStakeWithUSDT(usdtAmount, lockId, referrer);
    }

    /**
     * @dev Internal function for USDT purchase staking
     */
    function _buyAndStakeWithUSDT(
        uint256 usdtAmount, 
        uint256 lockId, 
        address referrer
    ) internal {
        require(usdtAmount >= MIN_USDT_PURCHASE, "Minimum 10 USDT required");
        require(lockId < lockConfigs.length, "Invalid lockId");
        require(activeStakeCount[msg.sender] < MAX_STAKES_PER_USER, "Too many active stakes");

        LockConfig memory l = lockConfigs[lockId];
        require(l.active, "Inactive lock config");

        // Calculate NILA equivalent: nilaAmount = (usdtAmount * 1e18) / 0.08e18
        uint256 nilaAmount = (usdtAmount * 10**18) / NILA_PRICE_USDT;
        
        // Transfer USDT from user to contract
        usdt.transferFrom(msg.sender, address(this), usdtAmount);
        totalUsdtCollected += usdtAmount;
        
        // Record NILA liability (no actual NILA transfer)
        totalNilaLiabilities += nilaAmount;

        // Calculate instant reward in USDT (based on amount config if using packages)
        uint256 instantRewardUSDT = 0;
        
        // Try to find matching amount config for instant rewards
        for (uint256 i = 0; i < amountConfigs.length; i++) {
            if (amountConfigs[i].active && amountConfigs[i].amount == nilaAmount) {
                // Calculate instant reward in USDT
                instantRewardUSDT = (usdtAmount * amountConfigs[i].instantRewardBps) / BPS;
                break;
            }
        }
        
        // Add instant rewards to claimable (in USDT)
        if (instantRewardUSDT > 0) {
            claimableInstantRewardsUSDT[msg.sender] += instantRewardUSDT;
        }

        // Handle referral rewards (in USDT)
        if (referrer != address(0) && !referralConfig.isPaused && referrers[msg.sender] == address(0)) {
            referrers[msg.sender] = referrer;
            referralCount[referrer]++;
            
            uint256 referralRewardUSDT = (usdtAmount * referralConfig.referralPercentageBps) / BPS;
            uint256 referrerBonusUSDT = (usdtAmount * referralConfig.referrerPercentageBps) / BPS;
            
            if (referralRewardUSDT > 0) {
                claimableReferralRewardsUSDT[referrer] += referralRewardUSDT;
                referralEarnings[referrer] += referralRewardUSDT;
            }
            
            if (referrerBonusUSDT > 0) {
                claimableReferralRewardsUSDT[msg.sender] += referrerBonusUSDT;
            }
            
            emit ReferralRegistered(referrer, msg.sender);
        }

        // Track unique stakers
        if (!hasStaked[msg.sender]) {
            hasStaked[msg.sender] = true;
            uniqueStakers++;
        }

        // Create stake record (NILA recorded as liability)
        uint256 stakeId = userStakes[msg.sender].length;
        userStakes[msg.sender].push(
            StakeInfo({
                amount: nilaAmount,
                usdtPaid: usdtAmount,
                startTime: block.timestamp,
                lastClaimTime: block.timestamp,
                unlockTime: block.timestamp + l.lockDuration,
                aprSnapshot: l.apr,
                instantRewardSnapshot: instantRewardUSDT,
                unstaked: false,
                isUsdtStake: true
            })
        );

        activeStakeCount[msg.sender]++;
        emit USDTStakeCreated(msg.sender, stakeId, usdtAmount, nilaAmount);
        emit Staked(msg.sender, stakeId, nilaAmount, lockId);
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

    /**
     * @notice Claim instant rewards in USDT
     */
    function claimInstantRewardsUSDT() external nonReentrant {
        uint256 amount = claimableInstantRewardsUSDT[msg.sender];
        require(amount > 0, "No USDT instant rewards to claim");
        require(usdt.balanceOf(address(this)) >= amount, "Insufficient USDT balance");

        claimableInstantRewardsUSDT[msg.sender] = 0;
        usdt.transfer(msg.sender, amount);
        emit InstantRewardClaimed(msg.sender, 0, amount);
    }

    /**
     * @notice Claim referral rewards in USDT
     */
    function claimReferralRewardsUSDT() external nonReentrant {
        uint256 amount = claimableReferralRewardsUSDT[msg.sender];
        require(amount > 0, "No USDT referral rewards to claim");
        require(usdt.balanceOf(address(this)) >= amount, "Insufficient USDT balance");

        claimableReferralRewardsUSDT[msg.sender] = 0;
        usdt.transfer(msg.sender, amount);
        emit ReferralBonusClaimed(msg.sender, amount);
    }

    /**
     * @notice Claim all USDT rewards (instant + referral)
     */
    function claimAllUSDTRewards() external nonReentrant {
        uint256 instantAmount = claimableInstantRewardsUSDT[msg.sender];
        uint256 referralAmount = claimableReferralRewardsUSDT[msg.sender];
        uint256 totalAmount = instantAmount + referralAmount;
        
        require(totalAmount > 0, "No USDT rewards to claim");
        require(usdt.balanceOf(address(this)) >= totalAmount, "Insufficient USDT balance");

        if (instantAmount > 0) {
            claimableInstantRewardsUSDT[msg.sender] = 0;
            emit InstantRewardClaimed(msg.sender, 0, instantAmount);
        }

        if (referralAmount > 0) {
            claimableReferralRewardsUSDT[msg.sender] = 0;
            emit ReferralBonusClaimed(msg.sender, referralAmount);
        }

        usdt.transfer(msg.sender, totalAmount);
    }

    function unstake(uint256 index) external nonReentrant {
        _validateIndex(msg.sender, index);
        StakeInfo storage s = userStakes[msg.sender][index];
        require(!s.unstaked, "Already unstaked");
        require(block.timestamp >= s.unlockTime, "Lock active");

        if (s.isUsdtStake) {
            // USDT purchase stake: Pay principal + APY rewards in NILA
            
            // Calculate APY rewards in NILA
            uint256 apyReward = pendingReward(msg.sender, index);
            uint256 totalNilaToReturn = s.amount + apyReward;
            
            require(nila.balanceOf(address(this)) >= totalNilaToReturn, "Insufficient NILA for payout");
            
            // Update liability tracking
            totalNilaLiabilities -= s.amount;
            
            // Mark as unstaked
            s.unstaked = true;
            activeStakeCount[msg.sender]--;
            
            // Transfer NILA (principal + APY rewards)
            nila.transfer(msg.sender, totalNilaToReturn);
            
            if (apyReward > 0) {
                emit RewardClaimed(msg.sender, index, apyReward);
            }
            emit Unstaked(msg.sender, index, s.amount);
            
        } else {
            // Old direct NILA stake: Existing logic
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

    /* ================= ADMIN LIABILITY MANAGEMENT ================= */

    /**
     * @notice Admin deposits NILA to cover liabilities
     * @param amount Amount of NILA to deposit
     */
    function depositNILAForLiabilities(uint256 amount) external onlyOwner {
        require(amount > 0, "Invalid amount");
        nila.transferFrom(msg.sender, address(this), amount);
        emit NILADepositedForLiabilities(msg.sender, amount);
    }

    /**
     * @notice Admin withdraws collected USDT
     * @param amount Amount of USDT to withdraw
     */
    function withdrawUSDT(uint256 amount) external onlyOwner {
        require(amount > 0, "Invalid amount");
        uint256 balance = usdt.balanceOf(address(this));
        require(amount <= balance, "Insufficient USDT balance");
        
        usdt.transfer(owner(), amount);
        emit USDTWithdrawn(owner(), amount);
    }

    /**
     * @notice Get NILA liability status
     */
    function getNILALiabilityStatus() external view returns (
        uint256 totalLiabilities,
        uint256 nilaBalance,
        uint256 deficitOrSurplus,
        bool hasSurplus
    ) {
        totalLiabilities = totalNilaLiabilities;
        nilaBalance = nila.balanceOf(address(this));
        
        // For old stakes, we need to account for totalStaked
        uint256 requiredNila = totalLiabilities + totalStaked;
        
        if (nilaBalance >= requiredNila) {
            hasSurplus = true;
            deficitOrSurplus = nilaBalance - requiredNila;
        } else {
            hasSurplus = false;
            deficitOrSurplus = requiredNila - nilaBalance;
        }
    }

    /**
     * @notice Get USDT balance in contract
     */
    function getUSDTBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
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
        details.usdtPaid = s.usdtPaid;
        details.startTime = s.startTime;
        details.lastClaimTime = s.lastClaimTime;
        details.unlockTime = s.unlockTime;
        details.apr = s.aprSnapshot;
        details.instantReward = s.instantRewardSnapshot;
        details.unstaked = s.unstaked;
        details.isUsdtStake = s.isUsdtStake;
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

    function getClaimableRewardsDetailed(address user) external view returns (
        uint256 instantRewardsNILA,
        uint256 referralRewardsNILA,
        uint256 instantRewardsUSDT,
        uint256 referralRewardsUSDT,
        uint256 apyRewardsNILA
    ) {
        instantRewardsNILA = claimableInstantRewards[user];
        referralRewardsNILA = claimableReferralRewards[user];
        instantRewardsUSDT = claimableInstantRewardsUSDT[user];
        referralRewardsUSDT = claimableReferralRewardsUSDT[user];
        
        // Calculate total APY rewards
        StakeInfo[] memory stakes = userStakes[user];
        for (uint256 i = 0; i < stakes.length; i++) {
            if (!stakes[i].unstaked) {
                apyRewardsNILA += pendingReward(user, i);
            }
        }
    }

    function version() external pure virtual returns (string memory) {
        return "2.0.0";
    }

    /**
     * @dev Storage gap for future upgrades
     * Reserves storage slots to allow adding new state variables in future upgrades
     */
    uint256[50] private __gap;
}
