const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const userApi = {
  // Connect wallet - register user in database
  connectWallet: async (walletAddress: string, referralCode?: string) => {
    try {
      console.log('📡 Calling API:', `${API_URL}/users/connect`);
      console.log('📤 Payload:', { walletAddress, referralCode });
      
      const response = await fetch(`${API_URL}/users/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, referralCode })
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ API Error:', error);
        throw new Error(error.error || 'Failed to connect wallet');
      }

      const result = await response.json();
      console.log('✅ API Success:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to register wallet:', error);
      // Don't throw - we don't want to block the user if API fails
      return null;
    }
  }
};
