"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateFrequencyStats = calculateFrequencyStats;
exports.calculateGapStats = calculateGapStats;
exports.calculateTopPairs = calculateTopPairs;
exports.predictTopNumbers = predictTopNumbers;
exports.calculateSpecialPrizeStats = calculateSpecialPrizeStats;
exports.generateOverviewSummary = generateOverviewSummary;
/**
 * Calculates frequency and gap metrics for all numbers (00 to 99) based on draw history.
 */
function calculateFrequencyStats(draws, maxNumber = 99) {
    const totalDraws = draws.length;
    const statsMap = new Map();
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
                const stat = statsMap.get(num);
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
function calculateGapStats(draws, maxNumber = 99) {
    const sortedDraws = [...draws].sort((a, b) => new Date(a.drawDate).getTime() - new Date(b.drawDate).getTime());
    const gapStats = [];
    for (let num = 0; num <= maxNumber; num++) {
        let currentGap = 0;
        let maxGap = 0;
        const gaps = [];
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
            }
            else {
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
function calculateTopPairs(draws, topN = 10) {
    const pairCounts = new Map();
    draws.forEach((draw) => {
        const nums = Array.from(new Set(draw.numbers)).sort((a, b) => a - b);
        for (let i = 0; i < nums.length; i++) {
            for (let j = i + 1; j < nums.length; j++) {
                const key = `${nums[i]}-${nums[j]}`;
                if (!pairCounts.has(key)) {
                    pairCounts.set(key, { pair: [nums[i], nums[j]], count: 1 });
                }
                else {
                    pairCounts.get(key).count += 1;
                }
            }
        }
    });
    return Array.from(pairCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, topN);
}
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
function predictTopNumbers(draws, topN = 2, maxNumber = 99) {
    if (draws.length === 0)
        return [];
    // Sort draws newest-first
    const sortedDesc = [...draws].sort((a, b) => new Date(b.drawDate).getTime() - new Date(a.drawDate).getTime());
    const sortedAsc = [...sortedDesc].reverse();
    const latestDrawNums = new Set(sortedDesc[0].numbers);
    // 1. Short-Term Momentum (Window of 15 draws, max 35 pts)
    const shortWindow = Math.min(15, sortedDesc.length);
    const recentFreq = new Map();
    for (let i = 0; i <= maxNumber; i++)
        recentFreq.set(i, 0);
    for (let i = 0; i < shortWindow; i++) {
        const weight = Math.pow(0.85, i); // Steeper decay
        const uniqueNums = new Set(sortedDesc[i].numbers);
        uniqueNums.forEach((num) => {
            if (num <= maxNumber) {
                recentFreq.set(num, (recentFreq.get(num) || 0) + weight);
            }
        });
    }
    const maxRecent = Math.max(...Array.from(recentFreq.values())) || 1;
    // 2. Personal Cycle Alignment & Max Gap Rebound (max 40 pts)
    const currentGapMap = new Map();
    const avgGapMap = new Map();
    const maxGapMap = new Map();
    const cycleMatchScores = new Map();
    for (let num = 0; num <= maxNumber; num++) {
        let curGap = 0;
        for (const draw of sortedDesc) {
            if (draw.numbers.includes(num))
                break;
            curGap++;
        }
        currentGapMap.set(num, curGap);
        const gaps = [];
        let g = 0;
        let maxG = 0;
        sortedAsc.forEach((d) => {
            if (d.numbers.includes(num)) {
                gaps.push(g);
                if (g > maxG)
                    maxG = g;
                g = 0;
            }
            else {
                g++;
            }
        });
        const historicalMaxG = Math.max(maxG, 1);
        maxGapMap.set(num, historicalMaxG);
        const avgG = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 8;
        avgGapMap.set(num, Number(avgG.toFixed(1)));
        let cycleScore = 0;
        const gapRatioToMax = curGap / historicalMaxG;
        if (historicalMaxG >= 10 && gapRatioToMax >= 0.9) {
            cycleScore = 40; // Max Gap Rebound Super Bonus
        }
        else if (avgG >= 2) {
            const ratio = curGap / avgG;
            if (ratio >= 0.85 && ratio <= 1.25) {
                cycleScore = 30; // Sweet spot explosion timing
            }
            else if (ratio >= 0.6 && ratio < 0.85) {
                cycleScore = 20; // Entering sweet spot window
            }
            else if (curGap === 1 || curGap === 2) {
                cycleScore = 15; // Regular rhythm
            }
        }
        else {
            if (curGap === 1 || curGap === 2)
                cycleScore = 18;
        }
        cycleMatchScores.set(num, cycleScore);
    }
    // 3. Global Next-Day Bạc Nhớ Transition (max 25 pts)
    const transitionMatrix = new Map();
    for (let i = 0; i < sortedAsc.length - 1; i++) {
        const todayNums = new Set(sortedAsc[i].numbers);
        const tmrNums = new Set(sortedAsc[i + 1].numbers);
        todayNums.forEach(prev => {
            tmrNums.forEach(next => {
                const key = `${prev}-${next}`;
                transitionMatrix.set(key, (transitionMatrix.get(key) || 0) + 1);
            });
        });
    }
    const bacNhoScores = new Map();
    let maxBacNho = 1;
    for (let num = 0; num <= maxNumber; num++) {
        let score = 0;
        latestDrawNums.forEach(prev => {
            score += transitionMatrix.get(`${prev}-${num}`) || 0;
        });
        bacNhoScores.set(num, score);
        if (score > maxBacNho)
            maxBacNho = score;
    }
    // 4. Saturation Penalty (-15 pts for 3+ consecutive hits)
    const saturationPenalty = new Map();
    for (let num = 0; num <= maxNumber; num++) {
        let streak = 0;
        for (let i = 0; i < Math.min(4, sortedDesc.length); i++) {
            if (sortedDesc[i].numbers.includes(num))
                streak++;
            else
                break;
        }
        saturationPenalty.set(num, streak >= 3 ? -15 : 0);
    }
    // Combine Scores
    const scores = Array.from({ length: maxNumber + 1 }, (_, num) => {
        const mScore = (recentFreq.get(num) / maxRecent) * 35;
        const cScore = cycleMatchScores.get(num) || 0;
        const bScore = (bacNhoScores.get(num) / maxBacNho) * 25;
        const sPenalty = saturationPenalty.get(num) || 0;
        const totalScore = Number((mScore + cScore + bScore + sPenalty).toFixed(1));
        const curG = currentGapMap.get(num);
        const avgG = avgGapMap.get(num);
        const maxG = maxGapMap.get(num);
        let reasoning = `Phong độ gần đây tốt`;
        if (cScore === 40) {
            reasoning = `💥 Bùng nổ: Chạm ngưỡng cực đại (Vắng ${curG}/${maxG} kỳ)`;
        }
        else if (cScore >= 30) {
            reasoning = `Rơi đúng điểm nổ chu kỳ cá nhân (Vắng ${curG} kỳ ~ TB ${avgG} kỳ)`;
        }
        else if (bScore >= 20) {
            reasoning = `Bạc nhớ toàn cục: Hay về ngay sau kết quả kỳ trước`;
        }
        else if (curG === 1 || curG === 2) {
            reasoning = `Nhịp nổ 1-2 kỳ đều đặn`;
        }
        else if (sPenalty < 0) {
            reasoning = `Cảnh báo: Dấu hiệu bão hòa (Nổ 3+ kỳ liên tiếp)`;
        }
        return { number: num, score: totalScore, reasoning };
    });
    return scores.sort((a, b) => b.score - a.score).slice(0, topN);
}
/**
 * Calculates GĐB (Đề) specific statistics, including Đầu/Đuôi frequencies, Tổng Đề omission gaps,
 * Next-Day GĐB Bạc Nhớ, and Day-Of-Week Bạc Nhớ (Algorithm v6).
 */
function calculateSpecialPrizeStats(draws) {
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
        const num = draw.bonusNumber;
        specialGaps.forEach((g) => {
            if (g.number === num) {
                if (g.currentGap > g.maxGap)
                    g.maxGap = g.currentGap;
                g.currentGap = 0;
            }
            else {
                g.currentGap += 1;
            }
        });
    });
    specialGaps.forEach((g) => {
        if (g.currentGap > g.maxGap)
            g.maxGap = g.currentGap;
    });
    const sortedSpecialGaps = [...specialGaps].sort((a, b) => b.currentGap - a.currentGap);
    const mostLaggingSpecialNumber = sortedSpecialGaps[0] ? {
        number: sortedSpecialGaps[0].number,
        currentGap: sortedSpecialGaps[0].currentGap,
        maxGap: sortedSpecialGaps[0].maxGap,
    } : null;
    // 2. Next-Day & Day-of-Week Bạc Nhớ Correlation Analysis
    const latestBonus = validDraws[validDraws.length - 1].bonusNumber;
    const followUpDauMap = new Map();
    const followUpDuoiMap = new Map();
    const followUpTongMap = new Map();
    const followUpNumMap = new Map();
    let occurrenceCount = 0;
    // Day of Week Maps
    const dowDauMap = new Map();
    const dowDuoiMap = new Map();
    const dowTongMap = new Map();
    let dowOccurrenceCount = 0;
    for (let i = 0; i < validDraws.length - 1; i++) {
        // Next-day Bac Nho
        if (validDraws[i].bonusNumber === latestBonus) {
            occurrenceCount++;
            const nxt = validDraws[i + 1].bonusNumber;
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
            const nxt = validDraws[i + 1].bonusNumber;
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
    const nextDayGdbStats = {
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
        const num = draw.bonusNumber;
        const dau = Math.floor(num / 10);
        const duoi = num % 10;
        const tong = (dau + duoi) % 10;
        dauStats.forEach((s) => {
            if (s.value === dau) {
                s.appearances++;
                s.currentGap = 0;
            }
            else {
                s.currentGap++;
            }
        });
        duoiStats.forEach((s) => {
            if (s.value === duoi) {
                s.appearances++;
                s.currentGap = 0;
            }
            else {
                s.currentGap++;
            }
        });
        tongStats.forEach((s) => {
            if (s.value === tong) {
                s.appearances++;
                s.currentGap = 0;
            }
            else {
                s.currentGap++;
            }
        });
    });
    // Balanced scoring model for Special Prize (Đề/Chạm/Tổng)
    // Frequency: Max 35 pts
    // Gap Zone Bonus: Max 25 pts
    // Next-Day Bạc Nhớ Bonus: Max 20 pts 
    // Day-of-Week Bạc Nhớ Bonus: Max 20 pts
    const getChamPredictions = (type, stats) => {
        const maxFreq = Math.max(...stats.map((s) => s.appearances));
        const followMap = type === 'CHAM_DAU' ? followUpDauMap : followUpDuoiMap;
        const dowMap = type === 'CHAM_DAU' ? dowDauMap : dowDuoiMap;
        return stats.map((s) => {
            const freqScore = maxFreq > 0 ? (s.appearances / maxFreq) * 35 : 0;
            let gapBonus = 0;
            if (s.currentGap >= 8 && s.currentGap <= 15) {
                gapBonus = 25;
            }
            else if (s.currentGap >= 4 && s.currentGap <= 7) {
                gapBonus = 15;
            }
            else if (s.currentGap <= 3) {
                gapBonus = 10;
            }
            else {
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
            }
            else if (dowBonus > 12) {
                reasoning = `Bạc nhớ Thứ: ${prefix} ${s.value} rất hay ra vào thứ ${nextDayOfWeek === 0 ? 'Chủ nhật' : nextDayOfWeek + 1}`;
            }
            else if (followCount > 0 && occurrenceCount > 0 && nextDayBonus > 12) {
                reasoning = `Bạc nhớ: Hay về sau khi GĐB ra ${String(latestBonus).padStart(2, '0')}`;
            }
            else if (s.currentGap > 15) {
                reasoning = `${prefix} ${s.value} cực khan (Vắng ${s.currentGap} kỳ)`;
            }
            else if (s.currentGap >= 8 && s.currentGap <= 15) {
                reasoning = `${prefix} ${s.value} rơi vào vùng bùng nổ (Vắng ${s.currentGap} kỳ)`;
            }
            else if (s.currentGap <= 3 && pct >= 12) {
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
        }
        else if (s.currentGap >= 4 && s.currentGap <= 7) {
            gapBonus = 15;
        }
        else if (s.currentGap <= 3) {
            gapBonus = 10;
        }
        else {
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
        }
        else if (dowBonus > 12) {
            reasoning = `Bạc nhớ Thứ: Tổng ${s.value} cực nhạy vào thứ ${nextDayOfWeek === 0 ? 'Chủ nhật' : nextDayOfWeek + 1}`;
        }
        else if (followCount > 0 && occurrenceCount > 0 && nextDayBonus > 12) {
            reasoning = `Bạc nhớ: Hay về sau khi GĐB ra ${String(latestBonus).padStart(2, '0')}`;
        }
        else if (s.currentGap > 15) {
            reasoning = `Tổng đề ${s.value} cực khan (Vắng ${s.currentGap} kỳ)`;
        }
        else if (s.currentGap >= 8 && s.currentGap <= 15) {
            reasoning = `Tổng đề ${s.value} rơi vào vùng nổ (Vắng ${s.currentGap} kỳ)`;
        }
        else if (s.currentGap <= 3) {
            reasoning = `Tổng đề ${s.value} về đều (Vắng ${s.currentGap} kỳ)`;
        }
        return {
            type: 'TONG',
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
    const gdbRecentFreq = new Map();
    for (let i = 0; i <= 99; i++)
        gdbRecentFreq.set(i, 0);
    const gdbShortWindow = Math.min(15, sortedDescGdb.length);
    for (let i = 0; i < gdbShortWindow; i++) {
        const w = Math.pow(0.85, i); // steeper decay
        const n = sortedDescGdb[i].bonusNumber;
        gdbRecentFreq.set(n, (gdbRecentFreq.get(n) || 0) + w);
    }
    const maxGdbRecent = Math.max(...Array.from(gdbRecentFreq.values())) || 1;
    // Personal cycle
    const gdbCycleScores = new Map();
    for (let num = 0; num <= 99; num++) {
        let curGap = 0;
        for (const d of sortedDescGdb) {
            if (d.bonusNumber === num)
                break;
            curGap++;
        }
        const gaps = [];
        let g = 0;
        let maxG = 0;
        for (const d of [...sortedDescGdb].reverse()) {
            if (d.bonusNumber === num) {
                gaps.push(g);
                if (g > maxG)
                    maxG = g;
                g = 0;
            }
            else {
                g++;
            }
        }
        const historicalMaxG = Math.max(maxG, 1);
        const avgGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 15;
        let cycleScore = 0;
        const gapRatioToMax = curGap / historicalMaxG;
        if (historicalMaxG >= 30 && gapRatioToMax >= 0.95)
            cycleScore = 35; // Max Gap Rebound
        else if (avgGap >= 2) {
            const ratio = curGap / avgGap;
            if (ratio >= 0.8 && ratio <= 1.3)
                cycleScore = 25;
            else if (ratio >= 0.5 && ratio < 0.8)
                cycleScore = 15;
            else if (curGap === 1)
                cycleScore = 10;
        }
        else if (curGap <= 2) {
            cycleScore = 15;
        }
        gdbCycleScores.set(num, { score: cycleScore, curGap, maxGap: historicalMaxG });
    }
    // Pre-calculate Cham/Tong max scores for Intersection matrix
    const maxChamDauScore = Math.max(...chamDauPredictions.map(p => p.score), 1);
    const maxChamDuoiScore = Math.max(...chamDuoiPredictions.map(p => p.score), 1);
    const maxTongScore = Math.max(...topTongPredictions.map(p => p.score), 1);
    const topGdbPredictions = Array.from({ length: 100 }, (_, num) => {
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
        const freqScore = (gdbRecentFreq.get(num) / maxGdbRecent) * 15;
        const { score: cScore, curGap, maxGap } = gdbCycleScores.get(num);
        const followCount = followUpNumMap.get(num) || 0;
        const bacNhoScore = occurrenceCount > 0 ? (followCount / Math.max(occurrenceCount, 1)) * 30 : 0;
        const totalScore = Number((freqScore + cScore + bacNhoScore + intersectionScore).toFixed(1));
        let reasoning = `Nhịp nổ gần đây tốt`;
        if (intersectionScore > 25 && cScore >= 25) {
            reasoning = `💥 SIÊU GIAO THOA: Điểm nổ chu kỳ + Cầu Đầu/Đuôi/Tổng đều đang chín`;
        }
        else if (cScore === 35) {
            reasoning = `Bùng nổ: Gần chạm max khan lịch sử (Vắng ${curGap}/${maxGap} kỳ)`;
        }
        else if (bacNhoScore > 15) {
            reasoning = `Bạc nhớ: Hay về ngày sau GĐB ${String(latestBonusNum).padStart(2, '0')} (${followCount} lần)`;
        }
        else if (intersectionScore > 24) {
            reasoning = `Giao thoa: Thuộc nhóm chạm/tổng có khả năng nổ cao nhất`;
        }
        else if (cScore === 25) {
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
function generateOverviewSummary(draws) {
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
