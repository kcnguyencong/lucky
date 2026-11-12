import axios from 'axios';
import * as cheerio from 'cheerio';
import { DrawRecord } from '@lottery/core';
import rawDraws from '../../draws_raw.json';

let cachedDraws: DrawRecord[] | null = null;
let lastFetchTime: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

function parseXoso30DaysHTML(html: string): DrawRecord[] {
  const $ = cheerio.load(html);
  const results: DrawRecord[] = [];

  $('table.table-result').each((idx, table) => {
    const $table = $(table);
    const parent = $table.closest('.section-content, div, section');

    let headerText = $table.prevAll('h2, h3, header, .section-header, .title-bor').first().text().trim();
    if (!headerText) {
      headerText = parent.prevAll('h2, h3, header, .section-header').first().text().trim();
    }
    if (!headerText) {
      headerText = parent.find('h2, h3, header, .section-header').first().text().trim();
    }

    const dateMatch = headerText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!dateMatch) return;

    const [fullMatch, day, month, year] = dateMatch;
    const drawDateStr = `${year}-${month}-${day}T18:30:00.000Z`;
    const drawId = `MB-${year}${month}${day}`;

    const numbers: number[] = [];
    let specialNumber: number | null = null;

    $table.find('tr').each((rIdx, tr) => {
      const rowText = $(tr).text().trim();
      const isDb = rowText.startsWith('ĐB') || $(tr).find('td:first-child').text().includes('ĐB');

      $(tr).find('td').each((cIdx, td) => {
        const text = $(td).text().trim();
        const tokens = text.split(/\s+/);
        tokens.forEach((tok) => {
          if (/^\d{2,5}$/.test(tok)) {
            const num = parseInt(tok.slice(-2), 10);
            if (!isNaN(num)) {
              numbers.push(num);
              if (isDb && specialNumber === null) {
                specialNumber = num;
              }
            }
          }
        });
      });
    });

    if (numbers.length >= 20) {
      results.push({
        id: drawId,
        drawId,
        lotteryType: 'XSMB',
        drawDate: drawDateStr,
        numbers,
        bonusNumber: specialNumber,
      });
    }
  });

  return results;
}

export async function getMergedDraws(forceRefresh = false): Promise<DrawRecord[]> {
  const now = Date.now();
  if (!forceRefresh && cachedDraws && now - lastFetchTime < CACHE_TTL) {
    return cachedDraws;
  }

  // Load baseline static draws for Vietlott and fallback
  const baseDrawsMap = new Map<string, DrawRecord>();
  (rawDraws as any[]).forEach((d: any) => {
    if (!baseDrawsMap.has(d.drawId)) {
      baseDrawsMap.set(d.drawId, {
        id: String(d.drawId),
        drawId: d.drawId,
        lotteryType: d.lotteryType || 'MEGA_645',
        drawDate: d.drawDate,
        numbers: Array.isArray(d.numbers) ? d.numbers : JSON.parse(d.numbers || '[]'),
        bonusNumber: d.bonusNumber || null,
      });
    }
  });
  const baseDraws = Array.from(baseDrawsMap.values());

  try {
    console.log('[LiveScraper] Fetching 30 continuous days of XSMB from xoso.com.vn...');
    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, Gecko) Chrome/125.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
    };

    const [res30, resP1] = await Promise.allSettled([
      axios.get('https://xoso.com.vn/xsmb-30-ngay.html', { timeout: 10000, headers }),
      axios.get('https://xoso.com.vn/xo-so-mien-bac/xsmb-p1.html', { timeout: 8000, headers }),
    ]);

    const liveXsmbMap = new Map<string, DrawRecord>();

    if (res30.status === 'fulfilled') {
      const draws30 = parseXoso30DaysHTML(res30.value.data);
      draws30.forEach((d) => liveXsmbMap.set(d.drawId, d));
    }

    if (resP1.status === 'fulfilled') {
      const drawsP1 = parseXoso30DaysHTML(resP1.value.data);
      drawsP1.forEach((d) => {
        if (!liveXsmbMap.has(d.drawId)) {
          liveXsmbMap.set(d.drawId, d);
        }
      });
    }

    const liveXsmbDraws = Array.from(liveXsmbMap.values());
    console.log(`[LiveScraper] Scraped ${liveXsmbDraws.length} continuous live XSMB draws.`);

    let finalDraws: DrawRecord[];

    if (liveXsmbDraws.length >= 20) {
      // Use ONLY continuous live XSMB draws so there are no missing-day gaps from old static draws!
      // Keep non-XSMB draws (Vietlott) from baseDraws.
      const nonXsmbDraws = baseDraws.filter((d) => d.lotteryType !== 'XSMB');
      finalDraws = [...liveXsmbDraws, ...nonXsmbDraws];
    } else {
      // Fallback merge if live fetch returned fewer than expected
      const merged = [...baseDraws];
      const existingIds = new Set(baseDraws.map((d) => d.drawId));
      for (const live of liveXsmbDraws) {
        if (!existingIds.has(live.drawId)) {
          merged.push(live);
          existingIds.add(live.drawId);
        }
      }
      finalDraws = merged;
    }

    // Sort descending by drawDate
    finalDraws.sort((a, b) => new Date(b.drawDate).getTime() - new Date(a.drawDate).getTime());

    cachedDraws = finalDraws;
    lastFetchTime = now;
    return finalDraws;
  } catch (error: any) {
    console.error(
      '[LiveScraper Error] Failed to scrape latest draws, falling back to static cache:',
      error.message
    );

    baseDraws.sort((a, b) => new Date(b.drawDate).getTime() - new Date(a.drawDate).getTime());

    if (!cachedDraws) {
      cachedDraws = baseDraws;
      lastFetchTime = now;
    }
    return cachedDraws;
  }
}
