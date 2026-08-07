export interface DrawResult {
  drawId: string;         // Unique draw number / period code
  lotteryType: string;    // e.g. "MEGA_645", "POWER_655"
  drawDate: string;       // ISO 8601 string YYYY-MM-DD
  numbers: number[];      // Sorted array of main drawn numbers
  bonusNumber?: number;   // Optional bonus / power ball number
  jackpotPrize?: number;  // Optional prize total
}

export interface ScraperConfig {
  targetUrl: string;
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
  userAgent: string;
  proxies?: string[];
}
