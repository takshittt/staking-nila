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
      
      // If error with fallback, use fallback
      if (data.error && data.fallback) {
        console.warn('Using fallback prices:', data.error);
        this.cache = data.fallback;
      } else {
        this.cache = data;
      }
      
      this.cacheTimestamp = now;
      return this.cache;

    } catch (error) {
      console.error('Failed to fetch prices from backend:', error);
      
      // Return cached data if available, otherwise use hardcoded fallback
      if (this.cache) {
        console.warn('Using cached prices due to fetch error');
        return this.cache;
      }

      // Hardcoded fallback as last resort
      const fallback: PriceData = {
        BNB: 600,
        ETH: 3000,
        TRX: 0.12,
        NILA: 0.08,
        timestamp: now
      };
      
      console.warn('Using hardcoded fallback prices');
      return fallback;
    }
  }

  static clearCache() {
    this.cache = null;
    this.cacheTimestamp = 0;
  }
}
