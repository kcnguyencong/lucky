'use client';

import React, { useEffect, useState } from 'react';
import { KPICards } from '@/components/KPICards';
import { NumberGridHeatmap } from '@/components/NumberGridHeatmap';
import { DrawHistoryTable } from '@/components/DrawHistoryTable';
import { Database, LineChart, Cpu, RefreshCw, BarChart2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function DashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [freqStats, setFreqStats] = useState<any[]>([]);
  const [draws, setDraws] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchDashboardData = async (page: number = 1) => {
    setLoading(true);
    try {
      const [sumRes, freqRes, drawsRes] = await Promise.all([
        fetch(`${API_BASE}/summary`).then((res) => res.json()),
        fetch(`${API_BASE}/stats/frequency`).then((res) => res.json()),
        fetch(`${API_BASE}/draws?page=${page}&limit=12`).then((res) => res.json()),
      ]);

      if (sumRes.success) setSummary(sumRes.data);
      if (freqRes.success) setFreqStats(freqRes.data);
      if (drawsRes.success) {
        setDraws(drawsRes.data);
        setPagination({
          page: drawsRes.pagination.page,
          totalPages: drawsRes.pagination.totalPages,
          total: drawsRes.pagination.total,
        });
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics from API backend:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(1);
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Top Navigation / Header Banner */}
        <header className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-slate-800 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
                <BarChart2 className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Lottery Analytics Engine
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  Real-time Statistical Dashboard & Data Ingestion Pipeline
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Fastify Backend Live
            </span>
          </div>
        </header>

        {/* Executive KPI Summary */}
        <KPICards summary={summary} />

        {/* Heatmap Section */}
        <NumberGridHeatmap stats={freqStats} />

        {/* Historical Data Table */}
        <DrawHistoryTable
          draws={draws}
          total={pagination.total}
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(page) => fetchDashboardData(page)}
          onRefresh={() => fetchDashboardData(pagination.page)}
        />
      </div>
    </main>
  );
}
