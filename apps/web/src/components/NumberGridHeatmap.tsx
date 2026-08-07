'use client';

import React from 'react';

interface FrequencyStat {
  number: number;
  appearances: number;
  percentage: number;
  gapCount: number;
}

interface NumberGridHeatmapProps {
  stats: FrequencyStat[];
}

export function NumberGridHeatmap({ stats }: NumberGridHeatmapProps) {
  if (!stats || stats.length === 0) {
    return <div className="h-64 bg-slate-800 animate-pulse rounded-xl"></div>;
  }

  // Calculate min & max appearances to compute color intensity
  const maxHits = Math.max(...stats.map((s) => s.appearances), 1);

  const getHeatColor = (hits: number) => {
    const ratio = hits / maxHits;
    if (hits === 0) return 'bg-slate-800 text-slate-500 border-slate-700/60';
    if (ratio > 0.75) return 'bg-amber-500 text-slate-950 font-extrabold border-amber-400 shadow-amber-500/20 shadow-md';
    if (ratio > 0.5) return 'bg-blue-600 text-white font-bold border-blue-400';
    if (ratio > 0.25) return 'bg-blue-900/60 text-blue-200 border-blue-800';
    return 'bg-slate-800/80 text-slate-300 border-slate-700';
  };

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-6 shadow-xl backdrop-blur-sm mb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🎯 Number Frequency Heatmap</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Visual matrix of numbers 00 - 99 showing appearance frequency intensity.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500 inline-block"></span>
            <span className="text-slate-300">Hot (&gt;75%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-600 inline-block"></span>
            <span className="text-slate-300">Medium</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-800 border border-slate-700 inline-block"></span>
            <span className="text-slate-300">Low / Cold</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
        {stats.map((stat) => {
          const numStr = String(stat.number).padStart(2, '0');
          return (
            <div
              key={stat.number}
              title={`Number ${numStr}: ${stat.appearances} hits (${stat.percentage}%), Gap: ${stat.gapCount} draws`}
              className={`flex flex-col items-center justify-center p-2.5 rounded-lg border transition-all hover:scale-105 cursor-pointer ${getHeatColor(
                stat.appearances
              )}`}
            >
              <span className="text-base tracking-wide">{numStr}</span>
              <span className="text-[10px] opacity-80 mt-0.5">{stat.appearances} hits</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
