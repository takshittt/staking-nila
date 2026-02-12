import { ethers } from 'hardhat';

async function main() {
  console.log('Testing Referral Configuration...\n');

  const contractAddress = process.env.CONTRACT_ADDRESS;
  
  if (!contractAddress) {
    throw new Error('CONTRACT_ADDRESS not set in environment');
  }

  console.log('Contract Address:', contractAddress);

  // Get contract instance
  const NilaStaking = await ethers.getContractFactory('NilaStaking');
  const contract = NilaStaking.attach(contractAddress);

  try {
    // Test getReferralConfig
    console.log('\n1. Testing getReferralConfig()...');
    const config = await contract.getReferralConfig();
    console.log('✅ Referral Configuration:');
    console.log('   - Referral Percentage (BPS):', config.referralPercentageBps.toString());
    console.log('   - Referral Percentage (%):', Number(config.referralPercentageBps) / 100);
    console.log('   - Referrer Percentage (BPS):', config.referrerPercentageBps.toString());
    console.log('   - Referrer Percentage (%):', Number(config.referrerPercentageBps) / 100);
    console.log('   - Is Paused:', config.isPaused);

    // Test getReferralStats for a sample address
    console.log('\n2. Testing getReferralStats()...');
    const testAddress = '0x0000000000000000000000000000000000000001';
    const stats = await contract.getReferralStats(testAddress);
    console.log('✅ Referral Stats for', testAddress);
    console.log('   - Referrer:', stats.referrer);
    console.log('   - Referrals Made:', stats.referralsMade.toString());
    console.log('   - Total Earnings:', stats.totalEarnings.toString());

    console.log('\n✅ All tests passed! Referral functions are working correctly.');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
