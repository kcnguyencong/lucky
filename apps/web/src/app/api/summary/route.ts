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
    const dbDraws = await prisma.lotteryDraw.findMany({
      orderBy: { drawDate: 'desc' },
    });
    const draws = dbDraws.map(formatDrawRecord);
    const summary = generateOverviewSummary(draws);
    return NextResponse.json({ success: true, data: summary });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
