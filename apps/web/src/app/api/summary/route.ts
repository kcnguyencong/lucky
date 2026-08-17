// Trigger build for core package v5 algorithm update
import { NextRequest, NextResponse } from 'next/server';
import { generateOverviewSummary, predictTopNumbers } from '@lottery/core';
import { getMergedDraws } from '@/lib/liveScraper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true';

    const draws = await getMergedDraws(refresh);
    const summary = generateOverviewSummary(draws);

    // Calculate validation for the most recent draw (prediction accuracy)
    let lastDrawValidation = null;
    if (draws.length > 1) {
      const latestDraw = draws[0];
      const pastHistory = draws.slice(1);
      
      // Predict what the numbers would be for the latestDraw, using only pastHistory
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
    }

    return NextResponse.json({
      success: true,
      data: {
        ...summary,
        lastDrawValidation,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
