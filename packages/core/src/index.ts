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
  gapCount: number; // Draws elapsed since last appearance
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
export function calculateFrequencyStats(draws: DrawRecord[], maxNumber: number = 99): FrequencyStat[] {
  const totalDraws = draws.length;
  const statsMap = new Map<number, FrequencyStat>();

  for (let i = 0; i <= maxNumber; i++) {
    statsMap.set(i, {
      number: i,
      appearances: 0,
      percentage: 0,
      lastDrawnAt: null,
      gapCount: totalDraws,
    });
  }

  // Sort draws descending by drawDate
  const sortedDraws = [...draws].sort((a, b) => new Date(b.drawDate).getTime() - new Date(a.drawDate).getTime());

  sortedDraws.forEach((draw, drawIndex) => {
    const uniqueNums = new Set(draw.numbers);
    uniqueNums.forEach((num) => {
      if (statsMap.has(num)) {
        const stat = statsMap.get(num)!;
        stat.appearances += 1;
        if (stat.lastDrawnAt === null) {
          stat.lastDrawnAt = draw.drawDate;
          stat.gapCount = drawIndex; // 0 means drawn in the most recent draw
        }
      }
    });
  });

  return Array.from(statsMap.values()).map((stat) => ({
    ...stat,
    percentage: totalDraws > 0 ? Number(((stat.appearances / totalDraws) * 100).toFixed(2)) : 0,
  }));
}

/**
 * Calculates omission gap stats for all numbers (current gap, historical max gap, avg gap).
 */
export function calculateGapStats(draws: DrawRecord[], maxNumber: number = 99): GapStat[] {
  const sortedDraws = [...draws].sort((a, b) => new Date(a.drawDate).getTime() - new Date(b.drawDate).getTime());
  const gapStats: GapStat[] = [];

  for (let num = 0; num <= maxNumber; num++) {
    let currentGap = 0;
    let maxGap = 0;
    const gaps: number[] = [];
    let appearances = 0;

    sortedDraws.forEach((draw) => {
      const hasNumber = draw.numbers.includes(num);
      if (hasNumber) {
        gaps.push(currentGap);
        if (currentGap > maxGap) {
          maxGap = currentGap;
        }
        currentGap = 0;
        appearances += 1;
      } else {
        currentGap += 1;
      }
    });

    if (currentGap > maxGap) {
      maxGap = currentGap;
    }

    const avgGap = gaps.length > 0 ? Number((gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(1)) : currentGap;

    gapStats.push({
      number: num,
      currentGap,
      maxGap,
      avgGap,
      totalAppearances: appearances,
    });
  }

  return gapStats;
}

/**
 * Calculates top co-occurring pairs of numbers.
 */
export function calculateTopPairs(draws: DrawRecord[], topN: number = 10): PairStat[] {
  const pairCounts = new Map<string, { pair: [number, number]; count: number }>();

  draws.forEach((draw) => {
    const nums = Array.from(new Set(draw.numbers)).sort((a, b) => a - b);
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        const key = `${nums[i]}-${nums[j]}`;
        if (!pairCounts.has(key)) {
          pairCounts.set(key, { pair: [nums[i], nums[j]], count: 1 });
        } else {
          pairCounts.get(key)!.count += 1;
        }
      }
    }
  });

  return Array.from(pairCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

/**
 * Predicts top N numbers most likely to appear in the next draw using a multi-factor scoring model:
 * 1. Historical frequency weight (Recency & Frequency)
 * 2. Omission gap elasticity (Numbers approaching or exceeding average gap score higher)
 * 3. Recent momentum (Appearances in last 10 draws)
 */
export function predictTopNumbers(
  draws: DrawRecord[],
  topN: number = 4,
  maxNumber: number = 99
): Array<{ number: number; score: number; reasoning: string }> {
  if (draws.length === 0) return [];

  const freqStats = calculateFrequencyStats(draws, maxNumber);
  const gapStats = calculateGapStats(draws, maxNumber);
  const totalDraws = draws.length;

  // Recent 10 draws momentum
  const sortedDraws = [...draws].sort((a, b) => new Date(b.drawDate).getTime() - new Date(a.drawDate).getTime());
  const recent10 = sortedDraws.slice(0, 10);
  const recentCounts = new Map<number, number>();
  recent10.forEach((d) => {
    d.numbers.forEach((num) => {
      recentCounts.set(num, (recentCounts.get(num) || 0) + 1);
    });
  });

  const scores = freqStats.map((freq) => {
    const gap = gapStats.find((g) => g.number === freq.number) || {
      currentGap: 0,
      avgGap: 1,
    };
    const recentHits = recentCounts.get(freq.number) || 0;

    // Normalize metrics
    const freqScore = totalDraws > 0 ? (freq.appearances / totalDraws) * 40 : 0; // max ~40 pts
    const momentumScore = (recentHits / 10) * 35; // max ~35 pts

    // Gap ratio: numbers near or above their avg gap get higher score
    const gapRatio = gap.avgGap > 0 ? gap.currentGap / gap.avgGap : 0;
    const gapScore = Math.min(gapRatio * 25, 25); // max ~25 pts

    const totalScore = Number((freqScore + momentumScore + gapScore).toFixed(1));

    let reasoning = 'Cân bằng tần suất';
    if (recentHits >= 3) {
      reasoning = `Đang vào dây hot (${recentHits} lần/10 kỳ)`;
    } else if (gapRatio >= 1.2) {
      reasoning = `Khan đến điểm nổ (Vắng ${gap.currentGap} kỳ)`;
    } else if (freq.percentage >= 3) {
      reasoning = `Tần suất cao (${freq.percentage}%)`;
    }

    return {
      number: freq.number,
      score: totalScore,
      reasoning,
    };
  });

  return scores.sort((a, b) => b.score - a.score).slice(0, topN);
}

/**
 * Generates overall summary stats for executive KPIs.
 */
export function generateOverviewSummary(draws: DrawRecord[]): OverviewSummary {
  if (draws.length === 0) {
    return {
      totalDraws: 0,
      latestDraw: null,
      hottestNumber: null,
      coldestNumber: null,
      mostLaggingNumber: null,
      topPredictions: [],
    };
  }

  const sortedDraws = [...draws].sort((a, b) => new Date(b.drawDate).getTime() - new Date(a.drawDate).getTime());
  const freqStats = calculateFrequencyStats(draws);
  const gapStats = calculateGapStats(draws);
  const predictions = predictTopNumbers(draws, 4);

  const sortedByAppearances = [...freqStats].sort((a, b) => b.appearances - a.appearances);
  const sortedByGap = [...gapStats].sort((a, b) => b.currentGap - a.currentGap);

  return {
    totalDraws: draws.length,
    latestDraw: sortedDraws[0],
    hottestNumber: sortedByAppearances[0] || null,
    coldestNumber: sortedByAppearances[sortedByAppearances.length - 1] || null,
    mostLaggingNumber: sortedByGap[0] || null,
    topPredictions: predictions,
  };
}
