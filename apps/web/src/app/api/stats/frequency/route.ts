import { NextRequest, NextResponse } from 'next/server';
import { calculateFrequencyStats } from '@lottery/core';
import { getMergedDraws } from '@/lib/liveScraper';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true';

    const draws = await getMergedDraws(refresh);
    const stats = calculateFrequencyStats(draws, 99);
    return NextResponse.json({ success: true, data: stats });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
