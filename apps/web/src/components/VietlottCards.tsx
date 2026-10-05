import React from 'react';
import { Target, Zap } from 'lucide-react';

interface VietlottPredictionTicket {
  numbers: number[];
  bonusNumber?: number;
  stats: {
    evenCount: number;
    oddCount: number;
    sum: number;
  };
  reasoning: string;
}

interface VietlottCardsProps {
  data: {
    max635?: VietlottPredictionTicket;
    mega645: VietlottPredictionTicket;
    power655: VietlottPredictionTicket;
  };
}

export function VietlottCards({ data }: VietlottCardsProps) {
  const { max635, mega645, power655 } = data;

  const renderBall = (num: number, isBonus = false) => {
    return (
      <div
        key={`${isBonus ? 'bonus' : 'reg'}-${num}`}
        className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-lg
          ${
            isBonus
              ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-slate-900 border-2 border-yellow-200'
              : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-2 border-indigo-300'
          }
        `}
      >
        {num.toString().padStart(2, '0')}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {/* Max 6/35 Card */}
      {max635 && (
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 transition-opacity">
            <Target className="w-12 h-12 text-cyan-500" />
          </div>
          
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-wide">Tự chọn 6/35</h3>
              <p className="text-xs text-slate-400">Dự đoán kỳ tới</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mb-6">
            {max635.numbers.map((n) => renderBall(n))}
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 text-sm border border-slate-700/50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400">Chẵn / Lẻ:</span>
              <span className="font-mono text-emerald-400">{max635.stats.evenCount} / {max635.stats.oddCount}</span>
            </div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-400">Tổng điểm:</span>
              <span className="font-mono text-amber-400">{max635.stats.sum}</span>
            </div>
            <div className="text-xs text-slate-300 italic border-t border-slate-700/50 pt-2">
              💡 {max635.reasoning}
            </div>
          </div>
        </div>
      )}

      {/* Mega 6/45 Card */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 transition-opacity">
          <Target className="w-12 h-12 text-pink-500" />
        </div>
        
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-pink-500/20 text-pink-400 rounded-lg">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-wide">Mega 6/45</h3>
            <p className="text-xs text-slate-400">Dự đoán kỳ tới</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          {mega645.numbers.map((n) => renderBall(n))}
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 text-sm border border-slate-700/50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-400">Chẵn / Lẻ:</span>
            <span className="font-mono text-emerald-400">{mega645.stats.evenCount} / {mega645.stats.oddCount}</span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-slate-400">Tổng điểm:</span>
            <span className="font-mono text-amber-400">{mega645.stats.sum}</span>
          </div>
          <div className="text-xs text-slate-300 italic border-t border-slate-700/50 pt-2">
            💡 {mega645.reasoning}
          </div>
        </div>
      </div>

      {/* Power 6/55 Card */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 transition-opacity">
          <Zap className="w-12 h-12 text-amber-500" />
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-wide">Power 6/55</h3>
            <p className="text-xs text-slate-400">Dự đoán kỳ tới (Kèm Jackpot 2)</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          {power655.numbers.map((n) => renderBall(n))}
          <div className="w-px h-8 bg-slate-700 mx-1"></div>
          {power655.bonusNumber && renderBall(power655.bonusNumber, true)}
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 text-sm border border-slate-700/50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-400">Chẵn / Lẻ:</span>
            <span className="font-mono text-emerald-400">{power655.stats.evenCount} / {power655.stats.oddCount}</span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-slate-400">Tổng điểm:</span>
            <span className="font-mono text-amber-400">{power655.stats.sum}</span>
          </div>
          <div className="text-xs text-slate-300 italic border-t border-slate-700/50 pt-2">
            💡 {power655.reasoning}
          </div>
        </div>
      </div>
    </div>
  );
}
