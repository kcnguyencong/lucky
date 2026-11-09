'use client';

import React from 'react';
import { Flame, TrendingUp, CheckCircle2, XCircle, ShieldCheck, Zap, Sparkles, DollarSign, Award } from 'lucide-react';

export interface LotoPairPredictionItem {
  pair: [number, number];
  pairLabel: string;
  score: number;
  probability: number;
  currentGap: number;
  recentGaps: number[];
  totalHits30: number;
  rhythmType: 'STEP_2' | 'STEP_1' | 'STEP_3' | 'BREAKOUT' | 'CASCADE' | 'STABLE';
  rhythmTitle: string;
  reasoning: string;
}

export interface LastDrawPairValidation {
  drawId: string;
  drawDate: string;
  pairs: Array<{
    pair: [number, number];
    pairLabel: string;
    isHit: boolean;
    hitNumbers: number[];
    rhythmTitle: string;
  }>;
  hitsCount: number;
}

interface LotoPairCardsProps {
  pairs?: LotoPairPredictionItem[];
  validation?: LastDrawPairValidation | null;
  drawDate?: string;
}

export function LotoPairCards({ pairs, validation, drawDate }: LotoPairCardsProps) {
  if (!pairs || pairs.length === 0) return null;

  const primaryPair = pairs[0];
  const secondaryPair = pairs.length > 1 ? pairs[1] : null;

  const nextDrawDateStr = (() => {
    if (!drawDate) return 'Hôm nay';
    try {
      const d = new Date(drawDate);
      if (isNaN(d.getTime())) return 'Hôm nay';
      d.setDate(d.getDate() + 1);
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return 'Hôm nay';
    }
  })();

  const renderBall = (num: number, isVip = true) => {
    const formatted = String(num).padStart(2, '0');
    return (
      <div
        className={`rounded-2xl flex items-center justify-center font-black shadow-lg transition-transform duration-300 hover:scale-105 ${
          isVip
            ? 'w-14 h-14 sm:w-16 sm:h-16 text-xl sm:text-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-slate-950 border-2 border-amber-200 shadow-amber-500/30'
            : 'w-11 h-11 sm:w-12 sm:h-12 text-base sm:text-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-2 border-indigo-200/40 shadow-indigo-500/20'
        }`}
      >
        {formatted}
      </div>
    );
  };

  return (
    <div className="mb-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-amber-500 to-rose-600 text-white rounded-xl shadow-lg shadow-amber-950/40">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                Bạch Thủ Cặp Duy Nhất
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Vào tiền có lãi ngay
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Tập trung nguồn vốn vào 1 cặp duy nhất (2 số) • Nổ 1 con là có lãi ~74% • Dự báo ngày {nextDrawDateStr}
            </p>
          </div>
        </div>

        {/* Validation badge for last draw */}
        {validation && (
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border backdrop-blur-md shadow-md text-xs font-bold ${
              validation.hitsCount > 0
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-emerald-950/30'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
            }`}
          >
            {validation.hitsCount > 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <XCircle className="w-4 h-4 text-slate-500" />
            )}
            <span>
              Kỳ #{validation.drawId.replace('MB-', '')}:{' '}
              {validation.hitsCount > 0
                ? `Ăn ${validation.pairs[0]?.hitNumbers.map((n) => String(n).padStart(2, '0')).join(', ')}`
                : 'Trượt'}
            </span>
          </div>
        )}
      </div>

      {/* Main Spotlight: Single Primary Golden Pair */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 border border-amber-500/40 bg-gradient-to-br from-slate-900/95 via-amber-950/20 to-slate-900/95 shadow-2xl backdrop-blur-xl mb-4">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Left: Highlighted Numbers & Badge */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20">
                <Award className="w-4 h-4" />
                CẶP VÀNG DUY NHẤT HÔM NAY
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <Zap className="w-3.5 h-3.5 fill-emerald-400" />
                Xác suất: ~{primaryPair.probability}%
              </span>
            </div>

            <div className="flex items-center gap-3.5 my-4">
              {renderBall(primaryPair.pair[0], true)}
              <span className="text-2xl font-black text-amber-400/80">/</span>
              {renderBall(primaryPair.pair[1], true)}

              <div className="ml-3 hidden sm:block">
                <div className="text-2xl font-black text-white font-mono tracking-tight">
                  {primaryPair.pairLabel}
                </div>
                <div className="text-xs text-amber-300 font-semibold mt-0.5">
                  Bạch thủ & Số lộn tương hỗ
                </div>
              </div>
            </div>

            {/* Profit logic explanation */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-semibold text-emerald-300">
              <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Chỉ đánh 1 cặp (2 con) $\rightarrow$ Nổ 1 con lãi ~74%, nổ cả đôi lãi ~248%!</span>
            </div>
          </div>

          {/* Right: Cadence & Stats Box */}
          <div className="bg-slate-950/70 rounded-2xl p-4 sm:p-5 border border-slate-800/80 md:min-w-[320px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                {primaryPair.rhythmTitle}
              </span>
              <span className="text-xs font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded-md">
                {primaryPair.score}đ
              </span>
            </div>

            <div className="text-xs text-slate-300 mb-3 flex items-center justify-between">
              <span>Nghỉ hiện tại: <strong className="text-amber-400">{primaryPair.currentGap}</strong> ngày</span>
              <span>Tần suất: <strong className="text-white">{primaryPair.totalHits30}/30</strong> kỳ</span>
            </div>

            {/* Gaps history */}
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-[10px] text-slate-400">Lịch sử nhịp:</span>
              {primaryPair.recentGaps.slice(0, 5).map((gap, gIdx) => (
                <span
                  key={gIdx}
                  className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-mono font-bold bg-slate-800 text-slate-200 border border-slate-700/60"
                  title={`Cách ${gap} ngày nghỉ`}
                >
                  {gap}
                </span>
              ))}
              <span className="text-[10px] text-slate-500 italic">(chu kỳ ngày nghỉ)</span>
            </div>

            {/* Reasoning */}
            <div className="text-xs text-slate-300 italic border-t border-slate-800 pt-2 flex items-start gap-1.5">
              <span className="text-sm shrink-0">💡</span>
              <span className="leading-relaxed">{primaryPair.reasoning}</span>
            </div>
          </div>
        </div>

        {/* Action Strategy Footer */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
          <span className="flex items-center gap-1.5 text-slate-300 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Khuyến nghị vào vốn: Đánh thẳng tay trong ngày hoặc nuôi khung 2 ngày (tỷ lệ 1:2.5)
          </span>
          <span className="text-slate-500">
            Tuyệt đối không nuôi quá 3 ngày nếu gãy nhịp.
          </span>
        </div>
      </div>

      {/* Secondary Backup Pair (Optional Reference) */}
      {secondaryPair && (
        <div className="bg-slate-900/40 rounded-2xl p-4 border border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-400">
              DỰ PHÒNG #2
            </span>
            <div className="flex items-center gap-2">
              {renderBall(secondaryPair.pair[0], false)}
              <span className="text-slate-600 font-bold">/</span>
              {renderBall(secondaryPair.pair[1], false)}
            </div>
            <div>
              <div className="font-bold text-slate-200">
                Cặp lót tham khảo: {secondaryPair.pairLabel}
              </div>
              <div className="text-[11px] text-slate-400">
                {secondaryPair.rhythmTitle} (Xác suất: ~{secondaryPair.probability}%)
              </div>
            </div>
          </div>

          <div className="text-slate-400 text-[11px] sm:text-right">
            <span>Tần suất: {secondaryPair.totalHits30}/30 kỳ • Nghỉ {secondaryPair.currentGap} ngày</span>
          </div>
        </div>
      )}
    </div>
  );
}
