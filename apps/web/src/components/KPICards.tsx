'use client';

import React from 'react';
import { Activity, Flame, Snowflake, Clock, Award } from 'lucide-react';

interface KPICardsProps {
  summary: {
    totalDraws: number;
    latestDraw: {
      drawId: string;
      drawDate: string;
      numbers: number[];
    } | null;
    hottestNumber: {
      number: number;
      appearances: number;
      percentage: number;
    } | null;
    coldestNumber: {
      number: number;
      appearances: number;
      percentage: number;
    } | null;
    mostLaggingNumber: {
      number: number;
      currentGap: number;
      maxGap: number;
    } | null;
    topPredictions?: Array<{
      number: number;
      score: number;
      reasoning: string;
    }>;
  } | null;
}

export function KPICards({ summary }: KPICardsProps) {
  if (!summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-slate-800 animate-pulse rounded-xl border border-slate-700"></div>
        ))}
      </div>
    );
  }

  const predictions = summary.topPredictions || [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      {/* Total Draws */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-400">Total Analyzed Draws</span>
          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
            <Activity className="w-5 h-5" />
          </div>
        </div>
        <div className="text-3xl font-extrabold text-white tracking-tight">{summary.totalDraws}</div>
        <p className="text-xs text-slate-400 mt-2">Latest Period: #{summary.latestDraw?.drawId || 'N/A'}</p>
      </div>

      {/* Hottest Number */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-400">Hottest Number</span>
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
            <Flame className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline space-x-3">
          <span className="text-3xl font-extrabold text-amber-400">
            {summary.hottestNumber ? String(summary.hottestNumber.number).padStart(2, '0') : '--'}
          </span>
          <span className="text-sm text-slate-300 font-medium">
            {summary.hottestNumber?.appearances} hits ({summary.hottestNumber?.percentage}%)
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-2">Highest frequency in dataset</p>
      </div>

      {/* Coldest / Most Lagging Number */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-400">Most Lagging (Cold)</span>
          <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
            <Snowflake className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline space-x-3">
          <span className="text-3xl font-extrabold text-cyan-400">
            {summary.mostLaggingNumber ? String(summary.mostLaggingNumber.number).padStart(2, '0') : '--'}
          </span>
          <span className="text-sm text-slate-300 font-medium">
            Gap: {summary.mostLaggingNumber?.currentGap} draws
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-2">Max historic gap: {summary.mostLaggingNumber?.maxGap} draws</p>
      </div>

      {/* Top 4 Predicted Numbers for Next Draw */}
      <div className="bg-gradient-to-br from-indigo-950/80 to-purple-950/80 border border-purple-500/30 rounded-xl p-5 shadow-lg backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-xl pointer-events-none"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-purple-300">Top 4 Dự Đoán Kỳ Tới</span>
          <div className="p-2 bg-purple-500/20 text-purple-300 rounded-lg border border-purple-400/30">
            <Award className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 my-2">
          {predictions.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <span className="inline-flex items-center justify-center w-9 h-9 bg-gradient-to-br from-purple-500 to-indigo-600 border border-purple-300/50 text-white text-sm font-extrabold rounded-xl shadow-md shadow-purple-900/50">
                {String(item.number).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-purple-300 font-medium mt-1">{item.score}đ</span>
            </div>
          ))}
          {predictions.length === 0 && (
            <span className="text-xs text-slate-400">Đang tính toán...</span>
          )}
        </div>
        <p className="text-xs text-purple-300/80 mt-2 font-medium">
          Dựa trên Tần suất, Chu kỳ Khan & Phong độ 10 kỳ
        </p>
      </div>
    </div>
  );
}
