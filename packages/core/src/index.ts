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
 * Predicts top N numbers most likely to appear in the next draw — Algorithm v7 (Trend Following & Cluster Model).
 *
 * Design Rationale:
 * - Shift away from "Max Gap Rebound" (Lô Gan) as it proved too risky.
 * - Multi-Factor Scoring Architecture:
 *   1. Cluster Model & Lô Rơi (Max 40 pts): Rewards numbers that appeared recently (gap 0, 1, 2) and heavily penalizes Lô Gan (gap > 12).
 *   2. Head/Tail Momentum & Đầu/Đuôi Câm (Max 35 pts): Rewards numbers belonging to currently hot Heads/Tails, or Heads/Tails that were missing in the previous draw (Cầu Đầu Câm).
 *   3. Short-Term Transition Matrix (Max 25 pts): Analyzes only the last 100 draws for short-term Bạc Nhớ trends.
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
  const sortedAsc = [...sortedDesc].reverse();
  const latestDrawNums = new Set(sortedDesc[0].numbers);

  // 1. Cluster Model & Lô Rơi (Max 40 pts) & Phạt Lô Gan (-50 pts)
  const currentGapMap = new Map<number, number>();
  const clusterScores = new Map<number, number>();

  for (let num = 0; num <= maxNumber; num++) {
    let curGap = 0;
    for (const draw of sortedDesc) {
      if (draw.numbers.includes(num)) break;
      curGap++;
    }
    currentGapMap.set(num, curGap);

    let score = 0;
    if (curGap > 12) {
      score = -50; // Phạt nặng Lô Gan
    } else if (curGap === 0) {
      score = 40; // Lô rơi từ kỳ trước
    } else if (curGap === 1) {
      score = 30; // Nhịp cách 1 ngày
    } else if (curGap === 2) {
      score = 20; // Nhịp cách 2 ngày
    } else if (curGap <= 5) {
      score = 10; // Đang trong vùng an toàn
    }
    clusterScores.set(num, score);
  }

  // 2. Head/Tail Momentum & Đầu/Đuôi Câm (Max 35 pts)
  const headFreq = new Array(10).fill(0);
  const tailFreq = new Array(10).fill(0);
  const shortWindow = Math.min(7, sortedDesc.length);
  
  for (let i = 0; i < shortWindow; i++) {
    const nums = new Set(sortedDesc[i].numbers);
    nums.forEach(num => {
      headFreq[Math.floor(num / 10)]++;
      tailFreq[num % 10]++;
    });
  }
  
  const maxHeadFreq = Math.max(...headFreq, 1);
  const maxTailFreq = Math.max(...tailFreq, 1);

  // Đầu câm / Đuôi câm ở kỳ quay MỚI NHẤT
  const latestHeadFreq = new Array(10).fill(0);
  const latestTailFreq = new Array(10).fill(0);
  latestDrawNums.forEach(num => {
    latestHeadFreq[Math.floor(num / 10)]++;
    latestTailFreq[num % 10]++;
  });

  const missingHeads = new Set<number>();
  const missingTails = new Set<number>();
  for (let i = 0; i < 10; i++) {
    if (latestHeadFreq[i] === 0) missingHeads.add(i);
    if (latestTailFreq[i] === 0) missingTails.add(i);
  }

  const momentumScores = new Map<number, number>();
  for (let num = 0; num <= maxNumber; num++) {
    const head = Math.floor(num / 10);
    const tail = num % 10;
    
    let score = ((headFreq[head] / maxHeadFreq) * 10) + ((tailFreq[tail] / maxTailFreq) * 10);
    
    // Thưởng Đầu/Đuôi câm
    if (missingHeads.has(head)) score += 15;
    if (missingTails.has(tail)) score += 15;
    
    momentumScores.set(num, Math.min(score, 35)); // Cap at 35
  }

  // 3. Short-Term Transition Matrix (Last 100 draws, max 25 pts)
  const transitionMatrix = new Map<string, number>();
  const transitionWindow = Math.min(100, sortedAsc.length);
  const recentAsc = sortedAsc.slice(sortedAsc.length - transitionWindow);
  
  for (let i = 0; i < recentAsc.length - 1; i++) {
    const todayNums = new Set(recentAsc[i].numbers);
    const tmrNums = new Set(recentAsc[i + 1].numbers);
    
    todayNums.forEach(prev => {
      tmrNums.forEach(next => {
        const key = `${prev}-${next}`;
        transitionMatrix.set(key, (transitionMatrix.get(key) || 0) + 1);
      });
    });
  }

  const bacNhoScores = new Map<number, number>();
  let maxBacNho = 1;
  for (let num = 0; num <= maxNumber; num++) {
    let score = 0;
    latestDrawNums.forEach(prev => {
      score += transitionMatrix.get(`${prev}-${num}`) || 0;
    });
    bacNhoScores.set(num, score);
    if (score > maxBacNho) maxBacNho = score;
  }

  // 4. Combine Scores
  const scores = Array.from({ length: maxNumber + 1 }, (_, num) => {
    const clusterScore = clusterScores.get(num)!;
    const mScore = momentumScores.get(num)!;
    const bScore = (bacNhoScores.get(num)! / maxBacNho) * 25;

    const totalScore = Number((clusterScore + mScore + bScore).toFixed(1));
    const curG = currentGapMap.get(num)!;
    const head = Math.floor(num / 10);
    const tail = num % 10;

    let reasoning = `Phong độ ổn định`;
    
    if (curG > 12) {
      reasoning = `Lô Gan rủi ro cao (Vắng ${curG} kỳ)`;
    } else if (missingHeads.has(head) || missingTails.has(tail)) {
      if (missingHeads.has(head) && missingTails.has(tail)) {
         reasoning = `💥 Cầu báo Kép Câm: Đầu ${head} & Đuôi ${tail} cùng câm`;
      } else if (missingHeads.has(head)) {
         reasoning = `🔥 Cầu Đầu Câm: Bắt lại Đầu ${head} (Câm kỳ trước)`;
      } else {
         reasoning = `🔥 Cầu Đuôi Câm: Bắt lại Đuôi ${tail} (Câm kỳ trước)`;
      }
    } else if (clusterScore === 40) {
      reasoning = `♻️ Bắt Lô rơi kỳ trước`;
    } else if (bScore >= 18) {
      reasoning = `Bạc nhớ ngắn hạn (100 kỳ): Dễ nổ sau bộ số hôm qua`;
    } else if (curG === 1) {
      reasoning = `Nhịp nghỉ 1 ngày đẹp`;
    } else if (mScore >= 20) {
      reasoning = `Ăn theo sức mạnh Đầu/Đuôi đang về nhiều`;
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
export function calculateSpecialPrizeStats(draws: DrawRecord[]): SpecialPrizeSummary {
  const validDraws = draws
    .filter((d) => d.bonusNumber !== null && d.bonusNumber !== undefined)
    .sort((a, b) => new Date(a.drawDate).getTime() - new Date(b.drawDate).getTime());

  if (validDraws.length === 0) {
    return {
      topChamPredictions: [],
      topTongPredictions: [],
      topGdbPredictions: [],
      mostLaggingSpecialNumber: null,
      nextDayGdbStats: null,
    };
  }

  const latestDrawDate = validDraws[validDraws.length - 1].drawDate;
  const nextDayOfWeek = (new Date(latestDrawDate).getDay() + 1) % 7; // Predict for the day AFTER latest draw

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

  // 2. Next-Day & Day-of-Week Bạc Nhớ Correlation Analysis
  const latestBonus = validDraws[validDraws.length - 1].bonusNumber!;
  const followUpDauMap = new Map<number, number>();
  const followUpDuoiMap = new Map<number, number>();
  const followUpTongMap = new Map<number, number>();
  const followUpNumMap = new Map<number, number>();
  let occurrenceCount = 0;

  // Day of Week Maps
  const dowDauMap = new Map<number, number>();
  const dowDuoiMap = new Map<number, number>();
  const dowTongMap = new Map<number, number>();
  let dowOccurrenceCount = 0;

  for (let i = 0; i < validDraws.length - 1; i++) {
    // Next-day Bac Nho
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
    
    // Day of Week Bac Nho (for the target day of week)
    const d = new Date(validDraws[i + 1].drawDate);
    if (d.getDay() === nextDayOfWeek) {
      dowOccurrenceCount++;
      const nxt = validDraws[i + 1].bonusNumber!;
      const dau = Math.floor(nxt / 10);
      const duoi = nxt % 10;
      const tong = (dau + duoi) % 10;

      dowDauMap.set(dau, (dowDauMap.get(dau) || 0) + 1);
      dowDuoiMap.set(duoi, (dowDuoiMap.get(duoi) || 0) + 1);
      dowTongMap.set(tong, (dowTongMap.get(tong) || 0) + 1);
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

  // Balanced scoring model for Special Prize (Đề/Chạm/Tổng)
  // Frequency: Max 35 pts
  // Gap Zone Bonus: Max 25 pts
  // Next-Day Bạc Nhớ Bonus: Max 20 pts 
  // Day-of-Week Bạc Nhớ Bonus: Max 20 pts
  const getChamPredictions = (type: 'CHAM_DAU' | 'CHAM_DUOI', stats: typeof dauStats): SpecialPrizePrediction[] => {
    const maxFreq = Math.max(...stats.map((s) => s.appearances));
    const followMap = type === 'CHAM_DAU' ? followUpDauMap : followUpDuoiMap;
    const dowMap = type === 'CHAM_DAU' ? dowDauMap : dowDuoiMap;

    return stats.map((s) => {
      const freqScore = maxFreq > 0 ? (s.appearances / maxFreq) * 35 : 0;

      let gapBonus = 0;
      if (s.currentGap >= 8 && s.currentGap <= 15) {
        gapBonus = 25;
      } else if (s.currentGap >= 4 && s.currentGap <= 7) {
        gapBonus = 15;
      } else if (s.currentGap <= 3) {
        gapBonus = 10;
      } else {
        gapBonus = 10;
      }

      // Next-Day Bạc nhớ bonus
      const followCount = followMap.get(s.value) || 0;
      const nextDayBonus = occurrenceCount > 0 ? (followCount / occurrenceCount) * 20 : 0;
      
      // Day-of-Week Bạc nhớ bonus
      const dowCount = dowMap.get(s.value) || 0;
      const dowBonus = dowOccurrenceCount > 0 ? (dowCount / dowOccurrenceCount) * 20 : 0;

      const totalScore = Number((freqScore + gapBonus + nextDayBonus + dowBonus).toFixed(1));
      const prefix = type === 'CHAM_DAU' ? 'Đầu' : 'Đuôi';
      const pct = Math.round((s.appearances / total) * 100);

      let reasoning = `${prefix} ${s.value} tần suất ${pct}%`;
      if (dowBonus > 10 && nextDayBonus > 10) {
        reasoning = `🔥 Giao thoa Bạc nhớ: Hay về sau Đề ${latestBonus} & Hay nổ vào thứ ${nextDayOfWeek === 0 ? 'Chủ nhật' : nextDayOfWeek + 1}`;
      } else if (dowBonus > 12) {
        reasoning = `Bạc nhớ Thứ: ${prefix} ${s.value} rất hay ra vào thứ ${nextDayOfWeek === 0 ? 'Chủ nhật' : nextDayOfWeek + 1}`;
      } else if (followCount > 0 && occurrenceCount > 0 && nextDayBonus > 12) {
        reasoning = `Bạc nhớ: Hay về sau khi GĐB ra ${String(latestBonus).padStart(2, '0')}`;
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
      const freqScore = maxTongFreq > 0 ? (s.appearances / maxTongFreq) * 35 : 0;

      let gapBonus = 0;
      if (s.currentGap >= 8 && s.currentGap <= 15) {
        gapBonus = 25;
      } else if (s.currentGap >= 4 && s.currentGap <= 7) {
        gapBonus = 15;
      } else if (s.currentGap <= 3) {
        gapBonus = 10;
      } else {
        gapBonus = 10;
      }

      const followCount = followUpTongMap.get(s.value) || 0;
      const nextDayBonus = occurrenceCount > 0 ? (followCount / occurrenceCount) * 20 : 0;
      
      const dowCount = dowTongMap.get(s.value) || 0;
      const dowBonus = dowOccurrenceCount > 0 ? (dowCount / dowOccurrenceCount) * 20 : 0;

      const totalScore = Number((freqScore + gapBonus + nextDayBonus + dowBonus).toFixed(1));
      const pct = Math.round((s.appearances / total) * 100);

      let reasoning = `Tổng đề ${s.value} tần suất ${pct}%`;
      if (dowBonus > 10 && nextDayBonus > 10) {
        reasoning = `🔥 Giao thoa Bạc nhớ Tổng: Theo Đề ${latestBonus} & Theo thứ ${nextDayOfWeek === 0 ? 'Chủ nhật' : nextDayOfWeek + 1}`;
      } else if (dowBonus > 12) {
        reasoning = `Bạc nhớ Thứ: Tổng ${s.value} cực nhạy vào thứ ${nextDayOfWeek === 0 ? 'Chủ nhật' : nextDayOfWeek + 1}`;
      } else if (followCount > 0 && occurrenceCount > 0 && nextDayBonus > 12) {
        reasoning = `Bạc nhớ: Hay về sau khi GĐB ra ${String(latestBonus).padStart(2, '0')}`;
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

  // 5. Top 4 GĐB Number Predictions (00-99) — Intersection Matrix
  // Combines Intersection of Cham/Tong + Bạc Nhớ Transition + Cycle
  const sortedDescGdb = [...validDraws].reverse(); 
  const latestBonusNum = latestBonus;

  // Short-term frequency
  const gdbRecentFreq = new Map<number, number>();
  for (let i = 0; i <= 99; i++) gdbRecentFreq.set(i, 0);
  const gdbShortWindow = Math.min(15, sortedDescGdb.length);
  for (let i = 0; i < gdbShortWindow; i++) {
    const w = Math.pow(0.85, i); // steeper decay
    const n = sortedDescGdb[i].bonusNumber!;
    gdbRecentFreq.set(n, (gdbRecentFreq.get(n) || 0) + w);
  }
  const maxGdbRecent = Math.max(...Array.from(gdbRecentFreq.values())) || 1;

  // Personal cycle
  const gdbCycleScores = new Map<number, { score: number; curGap: number; maxGap: number }>();
  for (let num = 0; num <= 99; num++) {
    let curGap = 0;
    for (const d of sortedDescGdb) {
      if (d.bonusNumber === num) break;
      curGap++;
    }
    const gaps: number[] = [];
    let g = 0;
    let maxG = 0;
    for (const d of [...sortedDescGdb].reverse()) {
      if (d.bonusNumber === num) { gaps.push(g); if (g > maxG) maxG = g; g = 0; } else { g++; }
    }
    const historicalMaxG = Math.max(maxG, 1);
    const avgGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 15;
    
    let cycleScore = 0;
    const gapRatioToMax = curGap / historicalMaxG;
    if (historicalMaxG >= 30 && gapRatioToMax >= 0.95) cycleScore = 35; // Max Gap Rebound
    else if (avgGap >= 2) {
      const ratio = curGap / avgGap;
      if (ratio >= 0.8 && ratio <= 1.3) cycleScore = 25;
      else if (ratio >= 0.5 && ratio < 0.8) cycleScore = 15;
      else if (curGap === 1) cycleScore = 10;
    } else if (curGap <= 2) {
      cycleScore = 15;
    }
    gdbCycleScores.set(num, { score: cycleScore, curGap, maxGap: historicalMaxG });
  }

  // Pre-calculate Cham/Tong max scores for Intersection matrix
  const maxChamDauScore = Math.max(...chamDauPredictions.map(p => p.score), 1);
  const maxChamDuoiScore = Math.max(...chamDuoiPredictions.map(p => p.score), 1);
  const maxTongScore = Math.max(...topTongPredictions.map(p => p.score), 1);

  const topGdbPredictions: GdbNumberPrediction[] = Array.from({ length: 100 }, (_, num) => {
    const dau = Math.floor(num / 10);
    const duoi = num % 10;
    const tong = (dau + duoi) % 10;

    // Intersection Points (Max 30)
    const dScore = chamDauPredictions.find(p => p.value === dau)?.score || 0;
    const duScore = chamDuoiPredictions.find(p => p.value === duoi)?.score || 0;
    const tScore = topTongPredictions.find(p => p.value === tong)?.score || 0;
    
    const intersectionScore = ((dScore / maxChamDauScore) * 10) + 
                              ((duScore / maxChamDuoiScore) * 10) + 
                              ((tScore / maxTongScore) * 10);

    const freqScore = (gdbRecentFreq.get(num)! / maxGdbRecent) * 15;
    const { score: cScore, curGap, maxGap } = gdbCycleScores.get(num)!;
    const followCount = followUpNumMap.get(num) || 0;
    const bacNhoScore = occurrenceCount > 0 ? (followCount / Math.max(occurrenceCount, 1)) * 30 : 0;
    
    const totalScore = Number((freqScore + cScore + bacNhoScore + intersectionScore).toFixed(1));

    let reasoning = `Nhịp nổ gần đây tốt`;
    if (intersectionScore > 25 && cScore >= 25) {
      reasoning = `💥 SIÊU GIAO THOA: Điểm nổ chu kỳ + Cầu Đầu/Đuôi/Tổng đều đang chín`;
    } else if (cScore === 35) {
      reasoning = `Bùng nổ: Gần chạm max khan lịch sử (Vắng ${curGap}/${maxGap} kỳ)`;
    } else if (bacNhoScore > 15) {
      reasoning = `Bạc nhớ: Hay về ngày sau GĐB ${String(latestBonusNum).padStart(2, '0')} (${followCount} lần)`;
    } else if (intersectionScore > 24) {
      reasoning = `Giao thoa: Thuộc nhóm chạm/tổng có khả năng nổ cao nhất`;
    } else if (cScore === 25) {
      reasoning = `Đúng chu kỳ nổ cá nhân`;
    }

    return { number: num, score: totalScore, reasoning };
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  return {
    topChamPredictions,
    topTongPredictions,
    topGdbPredictions,
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
        topGdbPredictions: [],
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

export interface VietlottPredictionTicket {
  numbers: number[];
  bonusNumber?: number; // Only for 6/55
  stats: {
    evenCount: number;
    oddCount: number;
    sum: number;
  };
  reasoning: string;
}

/**
 * Predicts a set of 6 numbers for Vietlott Mega 6/45 or Power 6/55.
 */
export function predictVietlott(
  draws: DrawRecord[],
  type: '6/45' | '6/55'
): VietlottPredictionTicket {
  const maxNumber = type === '6/45' ? 45 : 55;
  const targetSum = type === '6/45' ? 138 : 168; // Ideal bell curve center

  if (draws.length === 0) {
    return {
      numbers: [1, 2, 3, 4, 5, 6],
      stats: { evenCount: 3, oddCount: 3, sum: 21 },
      reasoning: 'Fallback',
    };
  }

  // 1. Analyze frequencies and gaps
  const sortedDesc = [...draws].sort(
    (a, b) => new Date(b.drawDate).getTime() - new Date(a.drawDate).getTime()
  );

  const freqMap = new Map<number, number>();
  const gapMap = new Map<number, number>();

  for (let num = 1; num <= maxNumber; num++) {
    freqMap.set(num, 0);
    let gap = 0;
    for (const draw of sortedDesc) {
      if (draw.numbers.includes(num)) break;
      gap++;
    }
    gapMap.set(num, gap);
  }

  const shortWindow = Math.min(30, sortedDesc.length);
  for (let i = 0; i < shortWindow; i++) {
    sortedDesc[i].numbers.forEach((num) => {
      if (num >= 1 && num <= maxNumber) {
        freqMap.set(num, (freqMap.get(num) || 0) + 1);
      }
    });
  }

  const sortedByFreq = Array.from(freqMap.entries())
    .sort((a, b) => b[1] - a[1] || gapMap.get(a[0])! - gapMap.get(b[0])!);
  const sortedByGap = Array.from(gapMap.entries()).sort((a, b) => b[1] - a[1]);

  const selectedNumbers = new Set<number>();

  // 1. Pick 2 Hot
  let hotCount = 0;
  for (const [num] of sortedByFreq) {
    if (hotCount < 2 && !selectedNumbers.has(num)) {
      selectedNumbers.add(num);
      hotCount++;
    }
  }

  // 2. Pick 1 Cold
  for (const [num] of sortedByGap) {
    if (!selectedNumbers.has(num)) {
      selectedNumbers.add(num);
      break;
    }
  }

  // 3. Add 1 consecutive
  let consecutiveAdded = false;
  for (const num of Array.from(selectedNumbers)) {
    if (!selectedNumbers.has(num + 1) && num + 1 <= maxNumber) {
      selectedNumbers.add(num + 1);
      consecutiveAdded = true;
      break;
    } else if (!selectedNumbers.has(num - 1) && num - 1 >= 1) {
      selectedNumbers.add(num - 1);
      consecutiveAdded = true;
      break;
    }
  }
  if (!consecutiveAdded) {
    for (let i = 1; i <= maxNumber; i++) {
      if (!selectedNumbers.has(i)) {
        selectedNumbers.add(i);
        break;
      }
    }
  }

  // 4. Smart Fill (remaining 2 numbers)
  while (selectedNumbers.size < 6) {
    let currentSum = Array.from(selectedNumbers).reduce((a, b) => a + b, 0);
    let evenCount = Array.from(selectedNumbers).filter((n) => n % 2 === 0).length;
    let oddCount = selectedNumbers.size - evenCount;

    let bestNum = -1;
    let bestScore = -Infinity;

    for (let num = 1; num <= maxNumber; num++) {
      if (selectedNumbers.has(num)) continue;

      let score = 0;
      // Prefer moving sum towards targetSum
      const newSum = currentSum + num;
      const sumDiff = Math.abs(targetSum - (newSum + (maxNumber / 2) * (5 - selectedNumbers.size))); 
      score -= sumDiff * 0.5; // Penalize deviation

      // Balance Even/Odd
      const isEven = num % 2 === 0;
      if (isEven && evenCount < 3) score += 10;
      if (!isEven && oddCount < 3) score += 10;

      // Add a bit of randomness or frequency weight to break ties
      score += (freqMap.get(num) || 0) * 0.1;

      if (score > bestScore) {
        bestScore = score;
        bestNum = num;
      }
    }

    if (bestNum !== -1) {
      selectedNumbers.add(bestNum);
    } else {
      for (let i = 1; i <= maxNumber; i++) {
        if (!selectedNumbers.has(i)) {
          selectedNumbers.add(i);
          break;
        }
      }
    }
  }

  const finalNumbers = Array.from(selectedNumbers).sort((a, b) => a - b);
  const sum = finalNumbers.reduce((a, b) => a + b, 0);
  const evenCount = finalNumbers.filter((n) => n % 2 === 0).length;
  const oddCount = 6 - evenCount;

  let bonusNumber: number | undefined = undefined;
  if (type === '6/55') {
    // We pick the 3rd hot number that isn't in selected for the Jackpot 2 bonus number
    for (const [num] of sortedByFreq) {
      if (!selectedNumbers.has(num)) {
        bonusNumber = num;
        break;
      }
    }
  }

  return {
    numbers: finalNumbers,
    bonusNumber,
    stats: {
      evenCount,
      oddCount,
      sum,
    },
    reasoning: `Mix 2 Hot / 1 Gan / Cặp Tiến. Tổng ${sum}, Chẵn/Lẻ (${evenCount}/${oddCount})`,
  };
}
