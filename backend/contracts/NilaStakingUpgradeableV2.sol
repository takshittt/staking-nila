// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "./NilaStakingUpgradeable.sol";

/**
 * @title NilaStakingUpgradeableV2
 * @dev Example V2 contract demonstrating how to add new features while preserving state
 * 
 * IMPORTANT UPGRADE RULES:
 * 1. Never change the order of existing state variables
 * 2. Never change the type of existing state variables
 * 3. Never remove existing state variables
 * 4. New state variables must be added AFTER existing ones
 * 5. Use the storage gap to add new variables safely
 */
contract NilaStakingUpgradeableV2 is NilaStakingUpgradeable {
    
    /* ================= NEW STATE VARIABLES (V2) ================= */
    // These are added from the storage gap, reducing __gap size accordingly
    
    // Example: Add emergency withdrawal fee
    uint256 public emergencyWithdrawFeeBps;
    
    // Example: Add stake multiplier for long-term stakers
    mapping(address => uint256) public stakeMultiplier;
    
    /* ================= NEW EVENTS (V2) ================= */
    event EmergencyWithdrawFeeUpdated(uint256 newFeeBps);
    event StakeMultiplierUpdated(address indexed user, uint256 multiplier);
    
    /**
     * @dev Initialize V2 features
     * This function should be called after upgrading to V2
     */
    function initializeV2(uint256 _emergencyWithdrawFeeBps) external onlyOwner {
        require(emergencyWithdrawFeeBps == 0, "Already initialized V2");
        require(_emergencyWithdrawFeeBps <= BPS, "Invalid fee");
        emergencyWithdrawFeeBps = _emergencyWithdrawFeeBps;
        emit EmergencyWithdrawFeeUpdated(_emergencyWithdrawFeeBps);
    }
    
    /* ================= NEW ADMIN FUNCTIONS (V2) ================= */
    
    function setEmergencyWithdrawFee(uint256 feeBps) external onlyOwner {
        require(feeBps <= BPS, "Invalid fee");
        emergencyWithdrawFeeBps = feeBps;
        emit EmergencyWithdrawFeeUpdated(feeBps);
    }
    
    function setStakeMultiplier(address user, uint256 multiplier) external onlyOwner {
        require(multiplier <= 200, "Multiplier too high"); // Max 2x
        stakeMultiplier[user] = multiplier;
        emit StakeMultiplierUpdated(user, multiplier);
    }
    
    /* ================= NEW VIEW FUNCTIONS (V2) ================= */
    
    /**
     * @dev Calculate pending reward with multiplier applied
     */
    function pendingRewardWithMultiplier(address user, uint256 index) public view returns (uint256) {
        uint256 baseReward = pendingReward(user, index);
        uint256 multiplier = stakeMultiplier[user];
        
        if (multiplier == 0) {
            return baseReward;
        }
        
        return (baseReward * (100 + multiplier)) / 100;
    }
    
    /**
     * @dev Get all V2 features for a user
     */
    function getV2Features(address user) external view returns (
        uint256 multiplier,
        uint256 emergencyFee
    ) {
        return (
            stakeMultiplier[user],
            emergencyWithdrawFeeBps
        );
    }
    
    /* ================= OVERRIDDEN FUNCTIONS (V2) ================= */
    
    /**
     * @dev Override version to return V2
     */
    function version() external pure override returns (string memory) {
        return "2.0.0";
    }
    
    /**
     * @dev Reduced storage gap to account for new variables
     * Original gap: 50 slots
     * Used in V2: 2 slots (emergencyWithdrawFeeBps + stakeMultiplier mapping)
     * Remaining: 48 slots
     */
    uint256[48] private __gapV2;
}
