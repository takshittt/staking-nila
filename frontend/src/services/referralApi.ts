import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005/api';

export const referralApi = {
  // Get referral configuration from database
  async getConfig(): Promise<{
    referralPercentage: number;
    referrerPercentage: number;
    isPaused: boolean;
  }> {
    const response = await axios.get(`${API_BASE_URL}/referrals/config`);
    return response.data.config;
  }
};
