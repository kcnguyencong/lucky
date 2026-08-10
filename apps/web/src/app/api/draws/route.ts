import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const allDraws = loadDraws();
    const total = allDraws.length;
    const items = allDraws.slice(skip, skip + limit);

    return NextResponse.json({
      success: true,
      data: items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
