import { NextResponse } from 'next/server';
import { calculateFrequencyStats, DrawRecord } from '@lottery/core';
import path from 'path';
import fs from 'fs';

function loadDraws(): DrawRecord[] {
  try {
    const candidates = [
      path.join(process.cwd(), 'draws_raw.json'),
      path.join(process.cwd(), 'apps/web/draws_raw.json'),
      path.join(__dirname, '../../../../../draws_raw.json'),
    ];
    let raw: any[] = [];
    for (const filePath of candidates) {
      if (fs.existsSync(filePath)) {
        raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        break;
      }
    }
    return raw.map((d: any) => ({
      id: String(d.drawId),
      drawId: d.drawId,
      lotteryType: d.lotteryType || 'POWER_655',
      drawDate: d.drawDate,
      numbers: Array.isArray(d.numbers) ? d.numbers : JSON.parse(d.numbers || '[]'),
      bonusNumber: d.bonusNumber || null,
    }));
  } catch (e) {
    console.error('Failed to load draws_raw.json:', e);
    return [];
  }
}

export async function GET() {
  try {
    const draws = loadDraws();
    const stats = calculateFrequencyStats(draws, 99);
    return NextResponse.json({ success: true, data: stats });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
