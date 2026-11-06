// Trigger build for core package v5 algorithm update
import { NextRequest, NextResponse } from 'next/server';
import { generateOverviewSummary, predictTopNumbers, predictTopLotoPairs } from '@lottery/core';
import { getMergedDraws } from '@/lib/liveScraper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true';

    const draws = await getMergedDraws(refresh);
    const lotoDraws = draws.filter(d => d.lotteryType === 'XSMB');
    const summary = generateOverviewSummary(lotoDraws);

    // Calculate validation for the most recent draw (prediction accuracy)
    let lastDrawValidation = null;
    let lastDrawPairValidation = null;

    if (draws.length > 1) {
      const latestDraw = draws[0];
      const pastHistory = draws.slice(1).filter(d => d.lotteryType === 'XSMB');
      
      // 1. Single predictions validation
      const pastPredictions = predictTopNumbers(pastHistory, 2);
      
      const validatedPredictions = pastPredictions.map((pred) => {
        const isHit = latestDraw.numbers.includes(pred.number);
        return {
          ...pred,
          isHit,
        };
      });

      const hitsCount = validatedPredictions.filter((p) => p.isHit).length;

      lastDrawValidation = {
        drawId: latestDraw.drawId,
        drawDate: latestDraw.drawDate,
        winningNumbers: latestDraw.numbers,
        predictions: validatedPredictions,
        hitsCount,
      };

      // 2. Loto pair predictions validation
      const pastPairs = predictTopLotoPairs(pastHistory, 2);
      const validatedPairs = pastPairs.map((pPred) => {
        const hitNumbers = pPred.pair.filter(n => latestDraw.numbers.includes(n));
        const isHit = hitNumbers.length > 0;
        return {
          ...pPred,
          isHit,
          hitNumbers,
        };
      });

      const pairHitsCount = validatedPairs.filter(p => p.isHit).length;

      lastDrawPairValidation = {
        drawId: latestDraw.drawId,
        drawDate: latestDraw.drawDate,
        pairs: validatedPairs,
        hitsCount: pairHitsCount,
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        ...summary,
        lastDrawValidation,
        lastDrawPairValidation,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
