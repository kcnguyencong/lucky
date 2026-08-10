import { NextResponse } from 'next/server';
import { generateOverviewSummary } from '@lottery/core';
import rawDraws from '../../../../draws_raw.json';

function loadDraws() {
  return (rawDraws as any[]).map((d: any) => ({
    id: String(d.drawId),
    drawId: d.drawId,
    lotteryType: d.lotteryType || 'POWER_655',
    drawDate: d.drawDate,
    numbers: Array.isArray(d.numbers) ? d.numbers : JSON.parse(d.numbers || '[]'),
    bonusNumber: d.bonusNumber || null,
  }));
}

export async function GET() {
  try {
    const draws = loadDraws();
    const summary = generateOverviewSummary(draws);
    return NextResponse.json({ success: true, data: summary });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
