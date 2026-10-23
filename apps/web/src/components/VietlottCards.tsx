'use client';

import React, { useState } from 'react';
import { Target, Zap, Flame, Snowflake, Scale } from 'lucide-react';

interface VietlottPredictionTicket {
  numbers: number[];
  bonusNumber?: number;
  strategy?: 'balanced' | 'hot' | 'cold';
  strategyName?: string;
  strategies?: {
    balanced: VietlottPredictionTicket;
    hot: VietlottPredictionTicket;
    cold: VietlottPredictionTicket;
  };
  stats: {
    evenCount: number;
    oddCount: number;
    sum: number;
  };
  reasoning: string;
}

interface VietlottCardsProps {
  data: {
    vietlott535?: VietlottPredictionTicket;
    mega645: VietlottPredictionTicket;
    power655: VietlottPredictionTicket;
  };
}

function VietlottGameCard({
  title,
  subTitle,
  icon: Icon,
  accentColor,
  ticket,
  hasBonus = false,
}: {
  title: string;
  subTitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: 'cyan' | 'pink' | 'amber';
  ticket?: VietlottPredictionTicket;
  hasBonus?: boolean;
}) {
  const [activeStrategy, setActiveStrategy] = useState<'balanced' | 'hot' | 'cold'>('balanced');

  if (!ticket) return null;

  const current = ticket.strategies ? ticket.strategies[activeStrategy] || ticket : ticket;

  const colorStyles = {
    cyan: {
      text: 'text-cyan-400',
      bgLight: 'bg-cyan-500/20',
      border: 'border-cyan-500/30',
      iconText: 'text-cyan-500',
    },
    pink: {
      text: 'text-pink-400',
      bgLight: 'bg-pink-500/20',
      border: 'border-pink-500/30',
      iconText: 'text-pink-500',
    },
    amber: {
      text: 'text-amber-400',
      bgLight: 'bg-amber-500/20',
      border: 'border-amber-500/30',
      iconText: 'text-amber-500',
    },
  }[accentColor];

  const renderBall = (num: number, isBonus = false) => {
    return (
      <div
        key={`${isBonus ? 'bonus' : 'reg'}-${num}`}
        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-base sm:text-lg font-bold shadow-lg transition-transform hover:scale-105
          ${
            isBonus
              ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-slate-900 border-2 border-yellow-200 shadow-amber-500/20'
              : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-2 border-indigo-300 shadow-indigo-500/20'
          }
        `}
      >
        {num.toString().padStart(2, '0')}
      </div>
    );
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group flex flex-col justify-between transition-all hover:border-slate-700">
      <div className="absolute top-0 right-0 p-3 opacity-15 group-hover:opacity-40 transition-opacity pointer-events-none">
        <Icon className={`w-14 h-14 ${colorStyles.iconText}`} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 ${colorStyles.bgLight} ${colorStyles.text} rounded-xl border ${colorStyles.border}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-wide">{title}</h3>
              <p className="text-xs text-slate-400">{subTitle}</p>
            </div>
          </div>
        </div>

        {/* Strategy Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/60 rounded-xl border border-slate-800/80 mb-5">
          <button
            onClick={() => setActiveStrategy('balanced')}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
              activeStrategy === 'balanced'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Cân Bằng</span>
          </button>

          <button
            onClick={() => setActiveStrategy('hot')}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
              activeStrategy === 'hot'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Phong Độ</span>
          </button>

          <button
            onClick={() => setActiveStrategy('cold')}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
              activeStrategy === 'cold'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Snowflake className="w-3.5 h-3.5" />
            <span>Săn Gan</span>
          </button>
        </div>

        {/* Prediction Balls */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 mb-6 min-h-[52px]">
          {current.numbers.map((n) => renderBall(n))}
          {hasBonus && current.bonusNumber && (
            <>
              <div className="w-px h-8 bg-slate-700 mx-1"></div>
              {renderBall(current.bonusNumber, true)}
            </>
          )}
        </div>
      </div>

      {/* Stats and Reasoning */}
      <div className="bg-slate-950/40 rounded-2xl p-4 text-sm border border-slate-800/70">
        <div className="flex justify-between items-center mb-2">
          <span className="text-slate-400 text-xs">Chẵn / Lẻ:</span>
          <span className="font-mono text-emerald-400 font-semibold">
            {current.stats.evenCount} / {current.stats.oddCount}
          </span>
        </div>
        <div className="flex justify-between items-center mb-3">
          <span className="text-slate-400 text-xs">Tổng điểm:</span>
          <span className="font-mono text-amber-400 font-semibold">{current.stats.sum}</span>
        </div>
        <div className="text-xs text-slate-300 italic border-t border-slate-800 pt-2.5 flex items-start gap-1.5">
          <span className="shrink-0 text-base leading-none">💡</span>
          <span className="leading-relaxed">{current.reasoning}</span>
        </div>
      </div>
    </div>
  );
}

export function VietlottCards({ data }: VietlottCardsProps) {
  const { vietlott535, mega645, power655 } = data;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {/* 5/35 Card */}
      <VietlottGameCard
        title="Vietlott 5/35"
        subTitle="Dự đoán kỳ tới (Kèm số đặc biệt)"
        icon={Target}
        accentColor="cyan"
        ticket={vietlott535}
        hasBonus={true}
      />

      {/* Mega 6/45 Card */}
      <VietlottGameCard
        title="Mega 6/45"
        subTitle="Dự đoán kỳ tới (6 số)"
        icon={Target}
        accentColor="pink"
        ticket={mega645}
      />

      {/* Power 6/55 Card */}
      <VietlottGameCard
        title="Power 6/55"
        subTitle="Dự đoán kỳ tới (6 số)"
        icon={Zap}
        accentColor="amber"
        ticket={power655}
      />
    </div>
  );
}
