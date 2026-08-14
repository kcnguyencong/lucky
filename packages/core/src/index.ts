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

    const allGaps = appearances > 0 ? [...gaps, currentGap] : [currentGap];
    const avgGap = Number((allGaps.reduce((a, b) => a + b, 0) / allGaps.length).toFixed(1));

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
 * Predicts top N numbers most likely to appear in the next draw — Algorithm v3.1.
 *
 * Design rationale:
 * - Exponentially-weighted Frequency is the primary signal (max 70 pts).
 * - Empirical Gap Bonus (max 15 pts) rewards stats-proven omission windows:
 *   gap=3 → +10 pts | gap=5–7 → +15 pts | gap=2,4 → +5 pts.
 */
export function predictTopNumbers(
  draws: DrawRecord[],
  topN: number = 2,
  maxNumber: number = 99
): Array<{ number: number; score: number; reasoning: string }> {
  if (draws.length === 0) return [];

  // Sort draws newest-first for decay calculation
  const sortedDesc = [...draws].sort(
    (a, b) => new Date(b.drawDate).getTime() - new Date(a.drawDate).getTime()
  );

  // --- Component 1: Exponentially-Decayed Frequency (max 70 pts) ---
  const DECAY = 0.92; // ~92% retention per draw
  const weightedFreq = new Map<number, number>();
  for (let i = 0; i <= maxNumber; i++) weightedFreq.set(i, 0);

  sortedDesc.forEach((draw, i) => {
    const weight = Math.pow(DECAY, i);
    const uniqueNums = new Set(draw.numbers);
    uniqueNums.forEach((num) => {
      if (num <= maxNumber) {
        weightedFreq.set(num, (weightedFreq.get(num) || 0) + weight);
      }
    });
  });

  const maxWeighted = Math.max(...Array.from(weightedFreq.values()));

  // --- Component 2: Empirical Gap Bonus (max 15 pts) ---
  const currentGap = new Map<number, number>();
  for (let i = 0; i <= maxNumber; i++) {
    let gap = 0;
    for (const draw of sortedDesc) {
      if (draw.numbers.includes(i)) break;
      gap++;
    }
    currentGap.set(i, gap);
  }

  // Build final scores
  const totalDraws = draws.length;
  const scores = Array.from({ length: maxNumber + 1 }, (_, num) => {
    const wf = weightedFreq.get(num) || 0;
    const rawAppearances = sortedDesc.filter((d) => d.numbers.includes(num)).length;
    const gap = currentGap.get(num) || 0;

    // Frequency score (dominant signal)
    const freqScore = maxWeighted > 0 ? (wf / maxWeighted) * 70 : 0;

    // Empirical gap bonus
    let gapBonus = 0;
    if (gap === 3) {
      gapBonus = 10;
    } else if (gap >= 5 && gap <= 7) {
      gapBonus = 15;
    } else if (gap === 2 || gap === 4) {
      gapBonus = 5;
    }

    const totalScore = Number((freqScore + gapBonus).toFixed(1));

    // Human-readable reasoning
    const pct = totalDraws > 0 ? ((rawAppearances / totalDraws) * 100).toFixed(1) : '0';
    let reasoning = `Tần suất ${pct}%`;
    if (gap >= 5 && gap <= 7) {
      reasoning = `Vắng ${gap} kỳ — vùng nổ cao nhất (tần suất ${pct}%)`;
    } else if (gap === 3) {
      reasoning = `Vắng ${gap} kỳ — vùng điểm ngọt (tần suất ${pct}%)`;
    } else if (gap === 2 || gap === 4) {
      reasoning = `Vắng ${gap} kỳ — nhịp điều hòa (tần suất ${pct}%)`;
    } else if (gap === 0) {
      reasoning = `Vừa nổ — đang dây hot (tần suất ${pct}%)`;
    } else if (gap === 1) {
      reasoning = `Nghỉ 1 kỳ — tần suất cao (${pct}%)`;
    }

    return { number: num, score: totalScore, reasoning };
  });

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

  // Balanced scoring model for Special Prize (Đề/Chạm/Tổng):
  // Frequency: Max 60 pts based on occurrence rate
  // Gap Zone Bonus: Max 40 pts based on realistic cycle (8-15 draws sweet spot)
  const getChamPredictions = (type: 'CHAM_DAU' | 'CHAM_DUOI', stats: typeof dauStats): SpecialPrizePrediction[] => {
    const maxFreq = Math.max(...stats.map(s => s.appearances));
    return stats.map((s) => {
      const freqScore = maxFreq > 0 ? (s.appearances / maxFreq) * 60 : 0;
      
      let gapBonus = 0;
      if (s.currentGap >= 8 && s.currentGap <= 15) {
        gapBonus = 40; // Sweet spot for Chạm break out
      } else if (s.currentGap >= 4 && s.currentGap <= 7) {
        gapBonus = 25; // Normal expected interval
      } else if (s.currentGap <= 3) {
        gapBonus = 20; // Hot streak retention
      } else {
        gapBonus = 25; // Extreme khan (>15 draws) has risk penalty
      }

      const totalScore = Number((freqScore + gapBonus).toFixed(1));
      const prefix = type === 'CHAM_DAU' ? 'Đầu' : 'Đuôi';
      const pct = Math.round((s.appearances / total) * 100);

      let reasoning = `${prefix} ${s.value} tần suất ${pct}%`;
      if (s.currentGap > 15) {
        reasoning = `${prefix} ${s.value} cực khan (Vắng ${s.currentGap} kỳ)`;
      } else if (s.currentGap >= 8 && s.currentGap <= 15) {
        reasoning = `${prefix} ${s.value} rơi vào vùng bùng nổ (Vắng ${s.currentGap} kỳ)`;
      } else if (s.currentGap <= 3 && pct >= 12) {
        reasoning = `${prefix} ${s.value} đang dây hot (nổ ${pct}%)`;
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

  const maxTongFreq = Math.max(...tongStats.map(s => s.appearances));
  const topTongPredictions = tongStats.map((s) => {
    const freqScore = maxTongFreq > 0 ? (s.appearances / maxTongFreq) * 60 : 0;
    
    let gapBonus = 0;
    if (s.currentGap >= 8 && s.currentGap <= 15) {
      gapBonus = 40;
    } else if (s.currentGap >= 4 && s.currentGap <= 7) {
      gapBonus = 25;
    } else if (s.currentGap <= 3) {
      gapBonus = 20;
    } else {
      gapBonus = 25;
    }

    const totalScore = Number((freqScore + gapBonus).toFixed(1));
    const pct = Math.round((s.appearances / total) * 100);

    let reasoning = `Tổng đề ${s.value} tần suất ${pct}%`;
    if (s.currentGap > 15) {
      reasoning = `Tổng đề ${s.value} cực khan (Vắng ${s.currentGap} kỳ)`;
    } else if (s.currentGap >= 8 && s.currentGap <= 15) {
      reasoning = `Tổng đề ${s.value} rơi vào vùng nổ (Vắng ${s.currentGap} kỳ)`;
    } else if (s.currentGap <= 3) {
      reasoning = `Tổng đề ${s.value} về đều (Vắng ${s.currentGap} kỳ)`;
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
  const predictions = predictTopNumbers(draws, 2);

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
