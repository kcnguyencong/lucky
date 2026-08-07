import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lottery/database';
import { DrawRecord } from '@lottery/core';

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';
    const lotteryType = searchParams.get('lotteryType');

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (lotteryType) {
      where.lotteryType = lotteryType;
    }

    let total = 0;
    let items: DrawRecord[] = [];
    try {
      const [dbTotal, dbItems] = await Promise.all([
        prisma.lotteryDraw.count({ where }),
        prisma.lotteryDraw.findMany({
          where,
          orderBy: { drawDate: 'desc' },
          skip,
          take: limitNum,
        }),
      ]);
      total = dbTotal;
      items = dbItems.map(formatDrawRecord);
    } catch (e) {
      console.warn('Prisma DB error, falling back to raw data:', e);
    }

    if (items.length === 0) {
      const rawData = require('../../../../../../draws_raw.json');
      total = rawData.length;
      items = rawData.slice(skip, skip + limitNum).map((d: any) => ({
        id: String(d.drawId),
        drawId: d.drawId,
        lotteryType: d.lotteryType || 'POWER_655',
        drawDate: d.drawDate,
        numbers: d.numbers || [],
        bonusNumber: d.bonusNumber || null,
      }));
    }

    return NextResponse.json({
      success: true,
      data: items,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
