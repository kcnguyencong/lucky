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
    let draws: DrawRecord[] = [];
    try {
      const dbDraws = await prisma.lotteryDraw.findMany({
        orderBy: { drawDate: 'desc' },
      });
      draws = dbDraws.map(formatDrawRecord);
    } catch (e) {
      console.warn('Prisma DB error, falling back to raw data:', e);
    }

    if (draws.length === 0) {
      // Fallback for Vercel Serverless environment where SQLite file may not be loaded
      const rawData = require('../../../../../../draws_raw.json');
      draws = rawData.map((d: any) => ({
        id: String(d.drawId),
        drawId: d.drawId,
        lotteryType: d.lotteryType || 'POWER_655',
        drawDate: d.drawDate,
        numbers: d.numbers || [],
        bonusNumber: d.bonusNumber || null,
      }));
    }

    const summary = generateOverviewSummary(draws);
    return NextResponse.json({ success: true, data: summary });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
