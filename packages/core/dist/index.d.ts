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
 * Predicts top N numbers most likely to appear in the next draw — Algorithm v6 (Explosive Predictive Model).
 *
 * Design Rationale:
 * - Multi-Factor Scoring Architecture:
 *   1. Short-Term Momentum (Window 15 draws with steeper 0.85 decay, max 35 pts).
 *   2. Personal Cycle Alignment & Max Gap Rebound (max 40 pts):
 *      - Rewards numbers hitting their personal historical mean gap sweet spot.
 *      - Super Bonus for numbers that reach >= 90% of their historical max gap (Explosive rebound).
 *   3. Global Next-Day Bạc Nhớ Transition (max 25 pts): Analyzes all historical draws to find what numbers follow the current draw's numbers.
 *   4. Saturation Penalty (-15 pts): Penalizes numbers that appeared 3+ consecutive draws.
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
