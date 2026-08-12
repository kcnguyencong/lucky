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

  if (topN === 4 && scores.length >= 4) {
    const candidateList = [...scores].sort((a, b) => b.score - a.score).slice(0, 30);
    
    // Precompute draw appearances for candidate numbers
    const drawAppearances = new Map<number, Set<number>>();
    candidateList.forEach(cand => {
      const set = new Set<number>();
      draws.forEach((draw, index) => {
        if (draw.numbers.includes(cand.number)) {
          set.add(index);
        }
      });
      drawAppearances.set(cand.number, set);
    });

    const getCorrelation = (numA: number, numB: number): number => {
      const drawsA = drawAppearances.get(numA)!;
      const drawsB = drawAppearances.get(numB)!;
      const n = draws.length;
      if (n === 0) return 0;
      
      const n1 = drawsA.size;
      const n2 = drawsB.size;
      let n12 = 0;
      for (const idx of drawsA) {
        if (drawsB.has(idx)) {
          n12++;
        }
      }
      
      if (n1 === 0 || n2 === 0 || n1 === n || n2 === n) return 0;
      
      const numerator = n12 * n - n1 * n2;
      const denominator = Math.sqrt(n1 * (n - n1) * n2 * (n - n2));
      return denominator === 0 ? 0 : numerator / denominator;
    };

    interface Combo {
      items: typeof candidateList;
      totalScore: number;
    }
    const combos: Combo[] = [];
    const nCandidates = candidateList.length;

    for (let i = 0; i < nCandidates; i++) {
      for (let j = i + 1; j < nCandidates; j++) {
        for (let k = j + 1; k < nCandidates; k++) {
          for (let m = k + 1; m < nCandidates; m++) {
            const items = [candidateList[i], candidateList[j], candidateList[k], candidateList[m]];
            const totalScore = items.reduce((sum, item) => sum + item.score, 0);
            combos.push({ items, totalScore });
          }
        }
      }
    }

    combos.sort((a, b) => b.totalScore - a.totalScore);

    const maxCorrelation = 0.15;
    for (const combo of combos) {
      const items = combo.items;
      const nums = items.map(item => item.number);
      
      // 1. Spatial Distribution Filter: ensure 4 numbers span at least 3 different tens digit zones
      const zones = new Set(nums.map(num => Math.floor(num / 10)));
      if (zones.size < 3) {
        continue;
      }

      // 2. Co-occurrence Correlation Check
      let hasHighCorrelation = false;
      for (let p1 = 0; p1 < nums.length; p1++) {
        for (let p2 = p1 + 1; p2 < nums.length; p2++) {
          const corr = getCorrelation(nums[p1], nums[p2]);
          if (corr >= maxCorrelation) {
            hasHighCorrelation = true;
            break;
          }
        }
        if (hasHighCorrelation) break;
      }

      if (!hasHighCorrelation) {
        return items;
      }
    }
  }

  return scores.sort((a, b) => b.score - a.score).slice(0, topN);
}

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
export function calculateSpecialPrizeStats(draws: DrawRecord[]): SpecialPrizeSummary {
  const validDraws = draws
    .filter((d) => d.bonusNumber !== null && d.bonusNumber !== undefined)
    .sort((a, b) => new Date(a.drawDate).getTime() - new Date(b.drawDate).getTime());

  if (validDraws.length === 0) {
    return {
      topChamPredictions: [],
      topTongPredictions: [],
      mostLaggingSpecialNumber: null,
    };
  }

  // 1. Calculate gaps for all 100 GĐB numbers (00-99)
  const specialGaps = Array.from({ length: 100 }, (_, i) => ({
    number: i,
    currentGap: 0,
    maxGap: 0,
  }));

  validDraws.forEach((draw) => {
    const num = draw.bonusNumber!;
    specialGaps.forEach((g) => {
      if (g.number === num) {
        if (g.currentGap > g.maxGap) g.maxGap = g.currentGap;
        g.currentGap = 0;
      } else {
        g.currentGap += 1;
      }
    });
  });

  specialGaps.forEach((g) => {
    if (g.currentGap > g.maxGap) g.maxGap = g.currentGap;
  });

  const sortedSpecialGaps = [...specialGaps].sort((a, b) => b.currentGap - a.currentGap);
  const mostLaggingSpecialNumber = sortedSpecialGaps[0] ? {
    number: sortedSpecialGaps[0].number,
    currentGap: sortedSpecialGaps[0].currentGap,
    maxGap: sortedSpecialGaps[0].maxGap,
  } : null;

  // 2. Calculate Đầu/Đuôi/Tổng frequencies and current gaps
  const dauStats = Array.from({ length: 10 }, (_, i) => ({ value: i, appearances: 0, currentGap: 0 }));
  const duoiStats = Array.from({ length: 10 }, (_, i) => ({ value: i, appearances: 0, currentGap: 0 }));
  const tongStats = Array.from({ length: 10 }, (_, i) => ({ value: i, appearances: 0, currentGap: 0 }));

  const total = validDraws.length;

  validDraws.forEach((draw) => {
    const num = draw.bonusNumber!;
    const dau = Math.floor(num / 10);
    const duoi = num % 10;
    const tong = (dau + duoi) % 10;

    dauStats.forEach((s) => {
      if (s.value === dau) {
        s.appearances++;
        s.currentGap = 0;
      } else {
        s.currentGap++;
      }
    });

    duoiStats.forEach((s) => {
      if (s.value === duoi) {
        s.appearances++;
        s.currentGap = 0;
      } else {
        s.currentGap++;
      }
    });

    tongStats.forEach((s) => {
      if (s.value === tong) {
        s.appearances++;
        s.currentGap = 0;
      } else {
        s.currentGap++;
      }
    });
  });

  // Calculate scores for Đầu/Đuôi predictions
  const getChamPredictions = (type: 'CHAM_DAU' | 'CHAM_DUOI', stats: typeof dauStats): SpecialPrizePrediction[] => {
    return stats.map((s) => {
      const freqScore = total > 0 ? (s.appearances / total) * 40 : 0;
      const expectedGap = 10; // expected average gap for 1 in 10 chance
      const gapRatio = s.currentGap / expectedGap;
      const gapScore = Math.min(gapRatio * 60, 60);
      const totalScore = Number((freqScore + gapScore).toFixed(1));

      let reasoning = type === 'CHAM_DAU' ? `Đầu ${s.value} khan (Vắng ${s.currentGap} kỳ)` : `Đuôi ${s.value} khan (Vắng ${s.currentGap} kỳ)`;
      if (s.currentGap > 15) {
        reasoning = `${type === 'CHAM_DAU' ? 'Đầu' : 'Đuôi'} ${s.value} cực khan (${s.currentGap} kỳ)`;
      } else if (s.appearances / total > 0.12) {
        reasoning = `${type === 'CHAM_DAU' ? 'Đầu' : 'Đuôi'} ${s.value} nổ nhiều (${Math.round((s.appearances / total) * 100)}%)`;
      } else {
        reasoning = `${type === 'CHAM_DAU' ? 'Đầu' : 'Đuôi'} ${s.value} tần suất đều`;
      }

      return {
        type,
        value: s.value,
        score: totalScore,
        reasoning,
      };
    });
  };

  const chamDauPredictions = getChamPredictions('CHAM_DAU', dauStats);
  const chamDuoiPredictions = getChamPredictions('CHAM_DUOI', duoiStats);

  const topChamPredictions = [...chamDauPredictions, ...chamDuoiPredictions]
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  const topTongPredictions = tongStats.map((s) => {
    const freqScore = total > 0 ? (s.appearances / total) * 40 : 0;
    const expectedGap = 10;
    const gapRatio = s.currentGap / expectedGap;
    const gapScore = Math.min(gapRatio * 60, 60);
    const totalScore = Number((freqScore + gapScore).toFixed(1));

    let reasoning = `Tổng đề ${s.value} khan (Vắng ${s.currentGap} kỳ)`;
    if (s.currentGap <= 5) {
      reasoning = `Tổng đề ${s.value} về đều`;
    }

    return {
      type: 'TONG' as const,
      value: s.value,
      score: totalScore,
      reasoning,
    };
  })
  .sort((a, b) => b.score - a.score)
  .slice(0, 2);

  return {
    topChamPredictions,
    topTongPredictions,
    mostLaggingSpecialNumber,
  };
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
      specialPrizeSummary: {
        topChamPredictions: [],
        topTongPredictions: [],
        mostLaggingSpecialNumber: null,
      },
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
    specialPrizeSummary: calculateSpecialPrizeStats(draws),
  };
}
