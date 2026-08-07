'use client';

import React, { useState } from 'react';
import { Calendar, Hash, Tag, RefreshCw } from 'lucide-react';

interface DrawItem {
  id: string;
  drawId: string;
  lotteryType: string;
  drawDate: string;
  numbers: number[];
  bonusNumber?: number | null;
}

interface DrawHistoryTableProps {
  draws: DrawItem[];
  total: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
}

export function DrawHistoryTable({
  draws,
  total,
  currentPage,
  totalPages,
  onPageChange,
  onRefresh,
}: DrawHistoryTableProps) {
  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-6 shadow-xl backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>📜 Historical Draw Records</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Total {total} archived lottery draw results ingested into SQLite database.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-lg border border-slate-600 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-900/60 text-slate-400 text-xs uppercase font-semibold border-b border-slate-700">
            <tr>
              <th className="px-4 py-3">Draw ID</th>
              <th className="px-4 py-3">Lottery Type</th>
              <th className="px-4 py-3">Draw Date</th>
              <th className="px-4 py-3">Winning Numbers</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {draws.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  No draw records found.
                </td>
              </tr>
            ) : (
              draws.map((item) => (
                <tr key={item.id} className="hover:bg-slate-700/30 transition">
                  <td className="px-4 py-3.5 font-semibold text-white">#{item.drawId}</td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <Tag className="w-3 h-3" />
                      {item.lotteryType}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-300">
                    {new Date(item.drawDate).toLocaleDateString('vi-VN', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      {item.numbers.map((num, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center justify-center w-7 h-7 bg-slate-900 border border-slate-600 text-amber-400 text-xs font-mono font-bold rounded-md"
                        >
                          {String(num).padStart(2, '0')}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-700 text-xs">
          <span className="text-slate-400">
            Page <strong className="text-white">{currentPage}</strong> of <strong className="text-white">{totalPages}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:hover:bg-slate-700 text-slate-200 rounded-md border border-slate-600 transition"
            >
              Previous
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:hover:bg-slate-700 text-slate-200 rounded-md border border-slate-600 transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
