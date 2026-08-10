'use client';

import React from 'react';
import { Activity, Flame, Snowflake, Award, CheckCircle2, XCircle } from 'lucide-react';

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
    lastDrawValidation?: {
      drawId: string;
      drawDate: string;
      winningNumbers: number[];
      predictions: Array<{
        number: number;
        score: number;
        reasoning: string;
        isHit: boolean;
      }>;
      hitsCount: number;
    } | null;
  } | null;
}

export function KPICards({ summary }: KPICardsProps) {
  if (!summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-slate-800/50 animate-pulse rounded-xl border border-slate-700/50"></div>
        ))}
      </div>
    );
  }

  const predictions = summary.topPredictions || [];
  const validation = summary.lastDrawValidation;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 mb-8">
      {/* Total Draws */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg backdrop-blur-sm transition-all hover:border-slate-700/60">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-400">Tổng Số Kỳ Phân Tích</span>
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <Activity className="w-5 h-5" />
          </div>
        </div>
        <div className="text-3xl font-extrabold text-white tracking-tight">{summary.totalDraws}</div>
        <p className="text-xs text-slate-500 mt-2 font-medium">Kỳ gần nhất: #{summary.latestDraw?.drawId || 'N/A'}</p>
      </div>

      {/* Hottest Number */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg backdrop-blur-sm transition-all hover:border-slate-700/60">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-400">Số Xuất Hiện Nhiều Nhất</span>
          <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Flame className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline space-x-3">
          <span className="text-3xl font-extrabold text-amber-400">
            {summary.hottestNumber ? String(summary.hottestNumber.number).padStart(2, '0') : '--'}
          </span>
          <span className="text-sm text-slate-300 font-bold">
            {summary.hottestNumber?.appearances} lần ({summary.hottestNumber?.percentage}%)
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-2 font-medium">Tần suất xuất hiện cao nhất</p>
      </div>

      {/* Coldest / Most Lagging Number */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg backdrop-blur-sm transition-all hover:border-slate-700/60">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-400">Số Gan Lì (Khan Nhất)</span>
          <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
            <Snowflake className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline space-x-3">
          <span className="text-3xl font-extrabold text-cyan-400">
            {summary.mostLaggingNumber ? String(summary.mostLaggingNumber.number).padStart(2, '0') : '--'}
          </span>
          <span className="text-sm text-slate-300 font-bold">
            Vắng {summary.mostLaggingNumber?.currentGap} kỳ
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-2 font-medium">Kỷ lục khan: {summary.mostLaggingNumber?.maxGap} kỳ chưa về</p>
      </div>

      {/* Top 4 Predicted Numbers for Next Draw */}
      <div className="bg-gradient-to-br from-indigo-950/40 to-purple-950/40 border border-indigo-500/30 rounded-xl p-5 shadow-lg backdrop-blur-sm relative overflow-hidden transition-all hover:border-indigo-500/50">
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-indigo-300">Top 4 Dự Đoán Kỳ Tới</span>
          <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-lg border border-indigo-400/30">
            <Award className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 my-2">
          {predictions.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <span className="inline-flex items-center justify-center w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 border border-indigo-300/30 text-white text-sm font-extrabold rounded-xl shadow-md shadow-indigo-950/50">
                {String(item.number).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-indigo-300 font-semibold mt-1">{item.score}đ</span>
            </div>
          ))}
          {predictions.length === 0 && (
            <span className="text-xs text-slate-400">Đang tính toán...</span>
          )}
        </div>
        <p className="text-xs text-indigo-400/80 mt-2 font-semibold">
          Kỳ tiếp theo • Chờ kết quả
        </p>
      </div>

      {/* Last Draw Validation */}
      <div className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-800 rounded-xl p-5 shadow-lg backdrop-blur-sm relative overflow-hidden transition-all hover:border-slate-700/60">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-slate-300">Kiểm Thử Kỳ Trước</span>
          <div className={`p-2 rounded-lg border text-xs font-bold ${
            validation && validation.hitsCount > 0 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            {validation ? `Trúng ${validation.hitsCount}/4` : 'N/A'}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 my-2">
          {validation?.predictions.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center relative">
              <span className={`inline-flex items-center justify-center w-9 h-9 border text-sm font-extrabold rounded-xl shadow-sm ${
                item.isHit 
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-emerald-950/50' 
                  : 'bg-slate-800/40 border-slate-700/40 text-slate-400'
              }`}>
                {String(item.number).padStart(2, '0')}
              </span>
              <span className="absolute -top-1.5 -right-1">
                {item.isHit ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 fill-slate-950" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-slate-500 fill-slate-950" />
                )}
              </span>
              <span className={`text-[10px] font-semibold mt-1 ${item.isHit ? 'text-emerald-400' : 'text-slate-500'}`}>
                {item.isHit ? 'TRÚNG' : 'TẠCH'}
              </span>
            </div>
          ))}
          {!validation && (
            <span className="text-xs text-slate-500">Không có dữ liệu</span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-2 font-medium">
          Đối chiếu kỳ: #{validation?.drawId.replace('MB-', '') || 'N/A'}
        </p>
      </div>
    </div>
  );
}

