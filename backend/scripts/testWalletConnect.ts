// Simple test to verify wallet connection endpoint
async function testWalletConnect() {
  console.log('🧪 Testing wallet connection endpoint...\n');

  try {
    const testWallet = '0xtest' + Date.now();
    
    console.log('1. Testing POST /api/users/connect');
    console.log('   Wallet:', testWallet);
    
    const response = await fetch('http://localhost:3001/api/users/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        walletAddress: testWallet,
        referralCode: 'TEST123'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API Error: ${error.error}`);
    }

    const result = await response.json();
    console.log('✅ Response:', JSON.stringify(result, null, 2));
    
    console.log('\n✨ Wallet connection endpoint is working!\n');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

testWalletConnect();
