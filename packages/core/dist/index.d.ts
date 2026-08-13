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
 * Predicts top N numbers most likely to appear in the next draw — Algorithm v3.1.
 *
 * Design rationale:
 * - Exponentially-weighted Frequency is the primary signal (max 70 pts).
 * - Empirical Gap Bonus (max 15 pts) rewards stats-proven omission windows:
 *   gap=3 → +10 pts | gap=5–7 → +15 pts | gap=2,4 → +5 pts.
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
export interface SpecialPrizeSummary {
    topChamPredictions: SpecialPrizePrediction[];
    topTongPredictions: SpecialPrizePrediction[];
    mostLaggingSpecialNumber: {
        number: number;
        currentGap: number;
        maxGap: number;
    } | null;
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
 * Calculates GĐB (Đề) specific statistics, including Đầu/Đuôi frequencies and Tổng Đề omission gaps.
 */
export declare function calculateSpecialPrizeStats(draws: DrawRecord[]): SpecialPrizeSummary;
/**
 * Generates overall summary stats for executive KPIs.
 */
export declare function generateOverviewSummary(draws: DrawRecord[]): OverviewSummary;
