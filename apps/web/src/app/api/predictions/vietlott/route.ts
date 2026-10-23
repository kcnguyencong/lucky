import { NextRequest, NextResponse } from 'next/server';
import { predictVietlottTickets } from '@lottery/core';
import { getMergedDraws } from '@/lib/liveScraper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true';

    const allDraws = await getMergedDraws(refresh);
    
    // Filter draws
    const draws535 = allDraws.filter(d => d.lotteryType === 'VIETLOTT_535');
    const drawsMega = allDraws.filter(d => d.lotteryType === 'MEGA_645');
    const drawsPower = allDraws.filter(d => d.lotteryType === 'POWER_655');

    const tickets535 = predictVietlottTickets(draws535, '5/35');
    const ticketsMega = predictVietlottTickets(drawsMega, '6/45');
    const ticketsPower = predictVietlottTickets(drawsPower, '6/55');

    return NextResponse.json({
      success: true,
      data: {
        vietlott535: {
          ...tickets535.balanced,
          strategies: tickets535,
        },
        mega645: {
          ...ticketsMega.balanced,
          strategies: ticketsMega,
        },
        power655: {
          ...ticketsPower.balanced,
          strategies: ticketsPower,
        },
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
