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
export function predictTopNumbers(
  draws: DrawRecord[],
  topN: number = 2,
  maxNumber: number = 99
): Array<{ number: number; score: number; reasoning: string }> {
  if (draws.length === 0) return [];

  // Sort draws newest-first
  const sortedDesc = [...draws].sort(
    (a, b) => new Date(b.drawDate).getTime() - new Date(a.drawDate).getTime()
  );
  const latestDrawNums = new Set(sortedDesc[0].numbers);

  // 1. Short-Term Momentum (Window of 12 draws with 0.90 decay, max 45 pts)
  const shortWindow = Math.min(12, sortedDesc.length);
  const recentFreq = new Map<number, number>();
  for (let i = 0; i <= maxNumber; i++) recentFreq.set(i, 0);

  for (let i = 0; i < shortWindow; i++) {
    const weight = Math.pow(0.9, i);
    const uniqueNums = new Set(sortedDesc[i].numbers);
    uniqueNums.forEach((num) => {
      if (num <= maxNumber) {
        recentFreq.set(num, (recentFreq.get(num) || 0) + weight);
      }
    });
  }
  const maxRecent = Math.max(...Array.from(recentFreq.values())) || 1;

  // 2. Personal Cycle Alignment (Gap-to-Average Elasticity, max 30 pts)
  const currentGapMap = new Map<number, number>();
  const avgGapMap = new Map<number, number>();
  const cycleMatchScores = new Map<number, number>();

  for (let num = 0; num <= maxNumber; num++) {
    let curGap = 0;
    for (const draw of sortedDesc) {
      if (draw.numbers.includes(num)) break;
      curGap++;
    }
    currentGapMap.set(num, curGap);

    const gaps: number[] = [];
    let g = 0;
    const asc = [...sortedDesc].reverse();
    asc.forEach((d) => {
      if (d.numbers.includes(num)) {
        gaps.push(g);
        g = 0;
      } else {
        g++;
      }
    });
    const avgG = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 8;
    avgGapMap.set(num, Number(avgG.toFixed(1)));

    let cycleScore = 0;
    if (avgG >= 2) {
      const ratio = curGap / avgG;
      if (ratio >= 0.8 && ratio <= 1.25) {
        cycleScore = 30; // Sweet spot explosion timing
      } else if (ratio >= 0.5 && ratio < 0.8) {
        cycleScore = 15; // Entering sweet spot window
      } else if (curGap === 1 || curGap === 2) {
        cycleScore = 12; // Regular 1-2 draw rhythm
      }
    } else {
      if (curGap === 1 || curGap === 2) cycleScore = 15;
    }
    cycleMatchScores.set(num, cycleScore);
  }

  // 3. Pair Coupling / Bạc Nhớ Co-occurrence (max 25 pts)
  const pairCoCounts = new Map<string, number>();
  sortedDesc.slice(0, 30).forEach((draw) => {
    const nums = Array.from(new Set(draw.numbers));
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        const k1 = `${nums[i]}-${nums[j]}`;
        const k2 = `${nums[j]}-${nums[i]}`;
        pairCoCounts.set(k1, (pairCoCounts.get(k1) || 0) + 1);
        pairCoCounts.set(k2, (pairCoCounts.get(k2) || 0) + 1);
      }
    }
  });

  const pairCouplingScores = new Map<number, number>();
  for (let num = 0; num <= maxNumber; num++) {
    let couplingSum = 0;
    latestDrawNums.forEach((prevNum) => {
      if (prevNum !== num) {
        couplingSum += pairCoCounts.get(`${prevNum}-${num}`) || 0;
      }
    });
    pairCouplingScores.set(num, couplingSum);
  }
  const maxPairCoupling = Math.max(...Array.from(pairCouplingScores.values())) || 1;

  // 4. Saturation Penalty (-15 pts for 3+ consecutive hits)
  const saturationPenalty = new Map<number, number>();
  for (let num = 0; num <= maxNumber; num++) {
    let streak = 0;
    for (let i = 0; i < Math.min(4, sortedDesc.length); i++) {
      if (sortedDesc[i].numbers.includes(num)) streak++;
      else break;
    }
    saturationPenalty.set(num, streak >= 3 ? -15 : 0);
  }

  // Combine Scores
  const scores = Array.from({ length: maxNumber + 1 }, (_, num) => {
    const mScore = (recentFreq.get(num)! / maxRecent) * 45;
    const cScore = cycleMatchScores.get(num) || 0;
    const pScore = (pairCouplingScores.get(num)! / maxPairCoupling) * 25;
    const sPenalty = saturationPenalty.get(num) || 0;

    const totalScore = Number((mScore + cScore + pScore + sPenalty).toFixed(1));
    const curG = currentGapMap.get(num)!;
    const avgG = avgGapMap.get(num)!;

    let reasoning = `Phong độ gần đây tốt`;
    if (cScore === 30) {
      reasoning = `Rơi đúng điểm nổ chu kỳ cá nhân (Vắng ${curG} kỳ ~ TB ${avgG} kỳ)`;
    } else if (pScore >= 18) {
      reasoning = `Bạc nhớ cặp số ăn theo từ kết quả kỳ trước`;
    } else if (curG === 1 || curG === 2) {
      reasoning = `Nhịp nổ 1-2 kỳ đều đặn`;
    } else if (sPenalty < 0) {
      reasoning = `Phong độ duy trì (Tránh rủi ro cạn nhịp)`;
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

export interface NextDayGdbStats {
  latestGdbNumber: number;
  occurrenceCount: number;
  topFollowUpNumbers: Array<{ number: number; count: number }>;
  topFollowUpDau: Array<{ value: number; count: number }>;
  topFollowUpDuoi: Array<{ value: number; count: number }>;
  topFollowUpTong: Array<{ value: number; count: number }>;
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
export function calculateSpecialPrizeStats(draws: DrawRecord[]): SpecialPrizeSummary {
  const validDraws = draws
    .filter((d) => d.bonusNumber !== null && d.bonusNumber !== undefined)
    .sort((a, b) => new Date(a.drawDate).getTime() - new Date(b.drawDate).getTime());

  if (validDraws.length === 0) {
    return {
      topChamPredictions: [],
      topTongPredictions: [],
      mostLaggingSpecialNumber: null,
      nextDayGdbStats: null,
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

  // 2. Next-Day GĐB Bạc Nhớ Correlation Analysis (mketqua.net statistics)
  const latestBonus = validDraws[validDraws.length - 1].bonusNumber!;
  const followUpDauMap = new Map<number, number>();
  const followUpDuoiMap = new Map<number, number>();
  const followUpTongMap = new Map<number, number>();
  const followUpNumMap = new Map<number, number>();
  let occurrenceCount = 0;

  for (let i = 0; i < validDraws.length - 1; i++) {
    if (validDraws[i].bonusNumber === latestBonus) {
      occurrenceCount++;
      const nxt = validDraws[i + 1].bonusNumber!;
      const dau = Math.floor(nxt / 10);
      const duoi = nxt % 10;
      const tong = (dau + duoi) % 10;

      followUpDauMap.set(dau, (followUpDauMap.get(dau) || 0) + 1);
      followUpDuoiMap.set(duoi, (followUpDuoiMap.get(duoi) || 0) + 1);
      followUpTongMap.set(tong, (followUpTongMap.get(tong) || 0) + 1);
      followUpNumMap.set(nxt, (followUpNumMap.get(nxt) || 0) + 1);
    }
  }

  const topFollowUpDau = Array.from(followUpDauMap.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);

  const topFollowUpDuoi = Array.from(followUpDuoiMap.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);

  const topFollowUpTong = Array.from(followUpTongMap.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);

  const topFollowUpNumbers = Array.from(followUpNumMap.entries())
    .map(([number, count]) => ({ number, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const nextDayGdbStats: NextDayGdbStats = {
    latestGdbNumber: latestBonus,
    occurrenceCount,
    topFollowUpNumbers,
    topFollowUpDau,
    topFollowUpDuoi,
    topFollowUpTong,
  };

  // 3. Calculate Đầu/Đuôi/Tổng frequencies and current gaps
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

  // Balanced scoring model for Special Prize (Đề/Chạm/Tổng) with Bạc Nhớ Next-Day integration:
  // Frequency: Max 50 pts
  // Gap Zone Bonus: Max 30 pts
  // Bạc Nhớ Correlation Bonus: Max 20 pts (based on follow-up frequency after latestBonus)
  const getChamPredictions = (type: 'CHAM_DAU' | 'CHAM_DUOI', stats: typeof dauStats): SpecialPrizePrediction[] => {
    const maxFreq = Math.max(...stats.map((s) => s.appearances));
    const followMap = type === 'CHAM_DAU' ? followUpDauMap : followUpDuoiMap;

    return stats.map((s) => {
      const freqScore = maxFreq > 0 ? (s.appearances / maxFreq) * 50 : 0;

      let gapBonus = 0;
      if (s.currentGap >= 8 && s.currentGap <= 15) {
        gapBonus = 30;
      } else if (s.currentGap >= 4 && s.currentGap <= 7) {
        gapBonus = 20;
      } else if (s.currentGap <= 3) {
        gapBonus = 15;
      } else {
        gapBonus = 15;
      }

      // Bạc nhớ follow-up bonus
      const followCount = followMap.get(s.value) || 0;
      const bacNhoBonus = occurrenceCount > 0 ? (followCount / occurrenceCount) * 20 : 0;

      const totalScore = Number((freqScore + gapBonus + bacNhoBonus).toFixed(1));
      const prefix = type === 'CHAM_DAU' ? 'Đầu' : 'Đuôi';
      const pct = Math.round((s.appearances / total) * 100);

      let reasoning = `${prefix} ${s.value} tần suất ${pct}%`;
      if (followCount > 0 && occurrenceCount > 0) {
        reasoning = `Bạc nhớ: ${prefix} ${s.value} hay về sau khi GĐB ra ${String(latestBonus).padStart(2, '0')} (${followCount}/${occurrenceCount} lần)`;
      } else if (s.currentGap > 15) {
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

  const maxTongFreq = Math.max(...tongStats.map((s) => s.appearances));
  const topTongPredictions = tongStats
    .map((s) => {
      const freqScore = maxTongFreq > 0 ? (s.appearances / maxTongFreq) * 50 : 0;

      let gapBonus = 0;
      if (s.currentGap >= 8 && s.currentGap <= 15) {
        gapBonus = 30;
      } else if (s.currentGap >= 4 && s.currentGap <= 7) {
        gapBonus = 20;
      } else if (s.currentGap <= 3) {
        gapBonus = 15;
      } else {
        gapBonus = 15;
      }

      const followCount = followUpTongMap.get(s.value) || 0;
      const bacNhoBonus = occurrenceCount > 0 ? (followCount / occurrenceCount) * 20 : 0;

      const totalScore = Number((freqScore + gapBonus + bacNhoBonus).toFixed(1));
      const pct = Math.round((s.appearances / total) * 100);

      let reasoning = `Tổng đề ${s.value} tần suất ${pct}%`;
      if (followCount > 0 && occurrenceCount > 0) {
        reasoning = `Bạc nhớ: Tổng ${s.value} hay về sau khi GĐB ra ${String(latestBonus).padStart(2, '0')} (${followCount}/${occurrenceCount} lần)`;
      } else if (s.currentGap > 15) {
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
    nextDayGdbStats,
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
