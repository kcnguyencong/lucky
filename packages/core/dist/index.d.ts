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
 * Predicts top N numbers most likely to appear in the next draw — Algorithm v7 (Trend Following & Cluster Model).
 *
 * Design Rationale:
 * - Shift away from "Max Gap Rebound" (Lô Gan) as it proved too risky.
 * - Multi-Factor Scoring Architecture:
 *   1. Cluster Model & Lô Rơi (Max 40 pts): Rewards numbers that appeared recently (gap 0, 1, 2) and heavily penalizes Lô Gan (gap > 12).
 *   2. Head/Tail Momentum & Đầu/Đuôi Câm (Max 35 pts): Rewards numbers belonging to currently hot Heads/Tails, or Heads/Tails that were missing in the previous draw (Cầu Đầu Câm).
 *   3. Short-Term Transition Matrix (Max 25 pts): Analyzes only the last 100 draws for short-term Bạc Nhớ trends.
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
