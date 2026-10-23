export interface DrawRecord {
    id: string;
    drawId: string;
    lotteryType: string;
    drawDate: Date | string;
    numbers: number[];
    bonusNumber?: number | null;
}
export interface FrequencyStat {
    number: number;
    appearances: number;
    percentage: number;
    lastDrawnAt: Date | string | null;
    gapCount: number;
}
export interface GapStat {
    number: number;
    currentGap: number;
    maxGap: number;
    avgGap: number;
    totalAppearances: number;
}
export interface PairStat {
    pair: [number, number];
    count: number;
}
/**
 * Calculates frequency and gap metrics for all numbers (00 to 99) based on draw history.
 */
export declare function calculateFrequencyStats(draws: DrawRecord[], maxNumber?: number): FrequencyStat[];
/**
 * Calculates omission gap stats for all numbers (current gap, historical max gap, avg gap).
 */
export declare function calculateGapStats(draws: DrawRecord[], maxNumber?: number): GapStat[];
/**
 * Calculates top co-occurring pairs of numbers.
 */
export declare function calculateTopPairs(draws: DrawRecord[], topN?: number): PairStat[];
/**
 * Predicts top N numbers most likely to appear in the next draw — Algorithm v8 (Synergy Song Thủ & Realistic Rhythm).
 *
 * Design Improvements:
 * 1. Realistic Gap Distribution: Reduces the heavy bias on Lô Rơi (gap 0, which only accounts for ~20% of draws).
 *    Prioritizes sweet-spot gaps (2-4 days) that statistically represent the peak breakout zone in XSMB.
 * 2. Head/Tail Momentum & Câm: Balanced bonus for missing heads/tails and recent active clusters.
 * 3. Short-Term Bạc Nhớ (100 draws): Directional transition matrix.
 * 4. Pair Synergy & Inversion (Cầu Song Thủ Lộn & Đồng Quy): The 2nd pick is paired with the 1st pick using
 *    inverted pairs (e.g., 27-72) and co-occurrence frequency to maximize hit probability.
 */
export declare function predictTopNumbers(draws: DrawRecord[], topN?: number, maxNumber?: number): Array<{
    number: number;
    score: number;
    reasoning: string;
}>;
export interface SpecialPrizePrediction {
    type: 'CHAM_DAU' | 'CHAM_DUOI' | 'TONG';
    value: number;
    score: number;
    reasoning: string;
}
export interface NextDayGdbStats {
    latestGdbNumber: number;
    occurrenceCount: number;
    topFollowUpNumbers: Array<{
        number: number;
        count: number;
    }>;
    topFollowUpDau: Array<{
        value: number;
        count: number;
    }>;
    topFollowUpDuoi: Array<{
        value: number;
        count: number;
    }>;
    topFollowUpTong: Array<{
        value: number;
        count: number;
    }>;
}
export interface GdbNumberPrediction {
    number: number;
    score: number;
    reasoning: string;
}
export interface SpecialPrizeSummary {
    topChamPredictions: SpecialPrizePrediction[];
    topTongPredictions: SpecialPrizePrediction[];
    topGdbPredictions: GdbNumberPrediction[];
    mostLaggingSpecialNumber: {
        number: number;
        currentGap: number;
        maxGap: number;
    } | null;
    nextDayGdbStats?: NextDayGdbStats | null;
}
export interface OverviewSummary {
    totalDraws: number;
    latestDraw: DrawRecord | null;
    hottestNumber: FrequencyStat | null;
    coldestNumber: FrequencyStat | null;
    mostLaggingNumber: GapStat | null;
    topPredictions: Array<{
        number: number;
        score: number;
        reasoning: string;
    }>;
    specialPrizeSummary: SpecialPrizeSummary;
}
/**
 * Calculates GĐB (Đề) specific statistics, including Đầu/Đuôi frequencies, Tổng Đề omission gaps,
 * Next-Day GĐB Bạc Nhớ, and Day-Of-Week Bạc Nhớ (Algorithm v6).
 */
export declare function calculateSpecialPrizeStats(draws: DrawRecord[]): SpecialPrizeSummary;
/**
 * Generates overall summary stats for executive KPIs.
 */
export declare function generateOverviewSummary(draws: DrawRecord[]): OverviewSummary;
export interface VietlottPredictionTicket {
    numbers: number[];
    bonusNumber?: number;
    strategy?: 'balanced' | 'hot' | 'cold';
    strategyName?: string;
    stats: {
        evenCount: number;
        oddCount: number;
        sum: number;
    };
    reasoning: string;
}
export type VietlottStrategy = 'balanced' | 'hot' | 'cold';
/**
 * Predicts a set of numbers for Vietlott 5/35, Mega 6/45, or Power 6/55 with multi-strategy support.
 */
export declare function predictVietlott(draws: DrawRecord[], type: '5/35' | '6/45' | '6/55', strategy?: VietlottStrategy): VietlottPredictionTicket;
/**
 * Predicts all 3 strategies (Balanced, Hot, Cold) for a given Vietlott game.
 */
export declare function predictVietlottTickets(draws: DrawRecord[], type: '5/35' | '6/45' | '6/55'): {
    balanced: VietlottPredictionTicket;
    hot: VietlottPredictionTicket;
    cold: VietlottPredictionTicket;
};
