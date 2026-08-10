import { NextResponse } from 'next/server';
import { prisma } from '@lottery/database';
import { generateOverviewSummary, DrawRecord } from '@lottery/core';

function formatDrawRecord(draw: any): DrawRecord {
  let numbersArr: number[] = [];
  try {
    numbersArr = typeof draw.numbers === 'string' ? JSON.parse(draw.numbers) : draw.numbers;
  } catch (e) {
    numbersArr = [];
  }
  return {
    id: draw.id,
    drawId: draw.drawId,
    lotteryType: draw.lotteryType,
    drawDate: draw.drawDate,
    numbers: numbersArr,
    bonusNumber: draw.bonusNumber,
  };
}

export async function GET() {
  try {
    const rawData = require('../../../../../../draws_raw.json');
    const draws: DrawRecord[] = rawData.map((d: any) => ({
      id: String(d.drawId),
      drawId: d.drawId,
      lotteryType: d.lotteryType || 'POWER_655',
      drawDate: d.drawDate,
      numbers: d.numbers || [],
      bonusNumber: d.bonusNumber || null,
    }));

    const summary = generateOverviewSummary(draws);
    return NextResponse.json({ success: true, data: summary });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
