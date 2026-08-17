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
 * Predicts top N numbers most likely to appear in the next draw — Algorithm v5 (Multi-Factor Model).
 *
 * Design Rationale:
 * - Does NOT rely on raw cumulative overall historical hits (which biases toward stale top-hit numbers).
 * - Multi-Factor Scoring Architecture:
 *   1. Short-Term Momentum (Window 12 draws with decay, max 45 pts).
 *   2. Personal Cycle Alignment (Gap-to-AvgElasticity, max 30 pts): Rewards numbers hitting their personal historical mean gap sweet spot.
 *   3. Pair Coupling / Bạc Nhớ (Co-occurrence with previous draw numbers, max 25 pts).
 *   4. Saturation Penalty (-15 pts): Penalizes numbers that appeared 3+ consecutive draws to prevent over-saturated picks.
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
export interface SpecialPrizeSummary {
    topChamPredictions: SpecialPrizePrediction[];
    topTongPredictions: SpecialPrizePrediction[];
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
 * and Next-Day GĐB Bạc Nhớ Correlation (mketqua.net statistics).
 */
export declare function calculateSpecialPrizeStats(draws: DrawRecord[]): SpecialPrizeSummary;
/**
 * Generates overall summary stats for executive KPIs.
 */
export declare function generateOverviewSummary(draws: DrawRecord[]): OverviewSummary;
