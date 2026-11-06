'use client';

import React from 'react';
import { Flame, TrendingUp, CheckCircle2, XCircle, ShieldCheck, Zap, Sparkles } from 'lucide-react';

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

  const renderBall = (num: number, isHitHighlight = false) => {
    const formatted = String(num).padStart(2, '0');
    return (
      <div
        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-lg sm:text-xl font-black shadow-lg transition-all duration-300 transform hover:scale-110 ${
          isHitHighlight
            ? 'bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 border-2 border-emerald-200 shadow-emerald-500/30'
            : 'bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-white border-2 border-indigo-200/40 shadow-indigo-500/25'
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
          <div className="p-2.5 bg-gradient-to-br from-rose-500 to-amber-500 text-white rounded-xl shadow-lg shadow-rose-950/40">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                Top 2 Cặp Loto Tần Suất Cao Nhất
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Chu kỳ ketqua16
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Phân tích 50 cặp loto song thủ theo ma trận nhịp sóng & điểm rơi xác suất • Dự báo ngày {nextDrawDateStr}
            </p>
          </div>
        </div>

        {/* Validation badge for last draw */}
        {validation && (
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border backdrop-blur-md shadow-md text-xs font-bold ${
              validation.hitsCount > 0
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-emerald-950/30'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-300 shadow-rose-950/30'
            }`}
          >
            {validation.hitsCount > 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>
              Kỳ trước (#{validation.drawId.replace('MB-', '')}): Nổ {validation.hitsCount}/2 cặp
            </span>
          </div>
        )}
      </div>

      {/* 2 Main Pair Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {pairs.slice(0, 2).map((item, idx) => {
          const isTop1 = idx === 0;
          return (
            <div
              key={item.pairLabel}
              className={`relative overflow-hidden rounded-3xl p-6 sm:p-7 border backdrop-blur-xl transition-all duration-300 hover:border-slate-600 shadow-2xl ${
                isTop1
                  ? 'bg-gradient-to-br from-slate-900/90 via-indigo-950/40 to-slate-900/90 border-indigo-500/30 shadow-indigo-950/20'
                  : 'bg-gradient-to-br from-slate-900/90 via-purple-950/30 to-slate-900/90 border-purple-500/30 shadow-purple-950/20'
              }`}
            >
              {/* Background ambient light */}
              <div
                className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
                  isTop1 ? 'bg-indigo-500/10' : 'bg-purple-500/10'
                }`}
              ></div>

              {/* Card Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black shadow-md ${
                      isTop1
                        ? 'bg-amber-400 text-slate-950 shadow-amber-400/20'
                        : 'bg-slate-700 text-slate-200'
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                    {isTop1 ? 'Cặp Ưu Tiên Số 1 (Bạch Kim)' : 'Cặp Ưu Tiên Số 2 (Vàng)'}
                  </span>
                </div>

                {/* Probability Badge */}
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-black shadow-sm shadow-emerald-950/30">
                  <Zap className="w-3.5 h-3.5 fill-emerald-400" />
                  <span>Xác suất nổ: ~{item.probability}%</span>
                </div>
              </div>

              {/* Main Numbers Display */}
              <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-3">
                  {renderBall(item.pair[0])}
                  <span className="text-xl font-extrabold text-slate-500">/</span>
                  {renderBall(item.pair[1])}
                </div>

                <div className="text-right">
                  <div className="text-2xl font-black text-white font-mono tracking-tight">
                    {item.score} <span className="text-xs font-normal text-slate-400">điểm nhịp</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Tần suất: <span className="text-amber-400 font-bold">{item.totalHits30}/30</span> kỳ gần nhất
                  </div>
                </div>
              </div>

              {/* Rhythm Badge & Timeline */}
              <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80 mb-4">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                    {item.rhythmTitle}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-md">
                    Nghỉ hiện tại: <strong className="text-white">{item.currentGap}</strong> kỳ
                  </span>
                </div>

                {/* Recent Gaps Indicator */}
                <div className="flex items-center gap-1.5 mt-2.5">
                  <span className="text-[10px] text-slate-400 mr-1">Lịch sử nhịp:</span>
                  {item.recentGaps.slice(0, 5).map((gap, gIdx) => (
                    <span
                      key={gIdx}
                      className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700/60"
                      title={`Kỳ nổ trước đó cách ${gap} ngày nghỉ`}
                    >
                      {gap}
                    </span>
                  ))}
                  <span className="text-[10px] text-slate-500 ml-1 italic">(kỳ nghỉ giữa các lần nổ)</span>
                </div>
              </div>

              {/* Reasoning */}
              <div className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed bg-indigo-500/5 rounded-xl p-3 border border-indigo-500/10">
                <span className="text-sm shrink-0">💡</span>
                <span>{item.reasoning}</span>
              </div>

              {/* Play Advice */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1 text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Khuyến nghị: Song thủ khung 2 ngày (tỷ lệ 1:2)
                </span>
                <span className="font-mono text-indigo-400 font-semibold">{item.pairLabel}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
