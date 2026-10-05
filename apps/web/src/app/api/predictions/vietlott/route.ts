import { NextRequest, NextResponse } from 'next/server';
import { predictVietlott } from '@lottery/core';
import { getMergedDraws } from '@/lib/liveScraper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true';

    const allDraws = await getMergedDraws(refresh);
    
    // Filter draws
    const drawsMax = allDraws.filter(d => d.lotteryType === 'MAX_635');
    const drawsMega = allDraws.filter(d => d.lotteryType === 'MEGA_645');
    const drawsPower = allDraws.filter(d => d.lotteryType === 'POWER_655');

    const maxPrediction = predictVietlott(drawsMax, '6/35');
    const megaPrediction = predictVietlott(drawsMega, '6/45');
    const powerPrediction = predictVietlott(drawsPower, '6/55');

    return NextResponse.json({
      success: true,
      data: {
        max635: maxPrediction,
        mega645: megaPrediction,
        power655: powerPrediction,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
