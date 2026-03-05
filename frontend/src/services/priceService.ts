const NILA_BUY_BACKEND_URL = import.meta.env.VITE_NILA_BUY_BACKEND_URL || 'http://localhost:3001';

export interface PriceData {
  BNB: number;
  ETH: number;
  TRX: number;
  NILA: number;
  timestamp: number;
}

export class PriceService {
  private static cache: PriceData | null = null;
  private static cacheTimestamp: number = 0;
  private static readonly CACHE_DURATION = 60000; // 60 seconds

  static async fetchPrices(): Promise<PriceData> {
    // Return cached data if still fresh
    const now = Date.now();
    if (this.cache && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.cache;
    }

    try {
      const response = await fetch(`${NILA_BUY_BACKEND_URL}/api/prices`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // If backend returns an error, throw it
      if (data.error) {
        throw new Error(data.error);
      }
      
      this.cache = data;
      this.cacheTimestamp = now;
      return this.cache as PriceData;

    } catch (error) {
      console.error('Failed to fetch prices from backend:', error);
      
      // Return cached data if available, otherwise throw error
      if (this.cache) {
        console.warn('Using cached prices due to fetch error');
        return this.cache as PriceData;
      }

      // Throw error instead of using hardcoded fallback
      throw new Error('Failed to fetch prices. Please check your connection and try again.');
    }
  }

  static clearCache() {
    this.cache = null;
    this.cacheTimestamp = 0;
  }
}
