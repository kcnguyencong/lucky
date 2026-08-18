import axios from 'axios';
import * as cheerio from 'cheerio';
import { DrawRecord } from '@lottery/core';
import rawDraws from '../../draws_raw.json';

let cachedDraws: DrawRecord[] | null = null;
let lastFetchTime: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

function parseHTML(html: string): DrawRecord[] {
  const $ = cheerio.load(html);
  const results: DrawRecord[] = [];

  $('#result_tab_mb').each((idx, table) => {
    const $table = $(table);
    
    // 1. Extract date (e.g. "Thứ hai ngày 03-08-2026")
    const dateText = $table.find('#result_date').text().trim();
    let drawDateStr = new Date().toISOString();
    if (dateText) {
      const match = dateText.match(/(\d{2})-(\d{2})-(\d{4})/);
      if (match) {
        const [_, day, month, year] = match;
        drawDateStr = new Date(`${year}-${month}-${day}T18:30:00.000Z`).toISOString();
      }
    }

    const dateKey = drawDateStr.substring(0, 10).replace(/-/g, '');
    const drawId = `MB-${dateKey}`;

    const numbers: number[] = [];
    let specialNumber: number | null = null;

    // Special prize (rs_0_0)
    const specialText = $table.find('#rs_0_0').text().trim();
    if (specialText && specialText.length >= 2) {
      const dbLotto = parseInt(specialText.slice(-2), 10);
      if (!isNaN(dbLotto)) {
        specialNumber = dbLotto;
        numbers.push(dbLotto);
      }
    }

    // All other prizes (2-digit tail)
    $table.find('div[id^="rs_"]').each((_, numDiv) => {
      const numText = $(numDiv).text().trim();
      if (numText && numText.length >= 2 && !$(numDiv).attr('id')?.startsWith('rs_8')) {
        const lottoNum = parseInt(numText.slice(-2), 10);
        if (!isNaN(lottoNum)) {
          numbers.push(lottoNum);
        }
      }
    });

    if (numbers.length > 0) {
      results.push({
        id: drawId,
        drawId: drawId,
        lotteryType: 'MEGA_645', // Kept consistent with front-end filter
        drawDate: drawDateStr,
        numbers: numbers,
        bonusNumber: specialNumber,
      });
    }
  });

  return results;
}

export async function getMergedDraws(forceRefresh = false): Promise<DrawRecord[]> {
  const now = Date.now();
  if (!forceRefresh && cachedDraws && (now - lastFetchTime < CACHE_TTL)) {
    return cachedDraws;
  }

  // Load baseline static draws and deduplicate by drawId
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
    console.log('[LiveScraper] Fetching latest draws from mketqua.net...');
    const response = await axios.get('https://mketqua.net/so-ket-qua', {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });

    const liveDraws = parseHTML(response.data);
    console.log(`[LiveScraper] Scraped ${liveDraws.length} live draws.`);

    // Merge logic: append live draws that do not exist in static draws
    const merged = [...baseDraws];
    const existingIds = new Set(baseDraws.map((d) => d.drawId));

    for (const live of liveDraws) {
      if (!existingIds.has(live.drawId)) {
        console.log(`[LiveScraper] Merging new live draw: ${live.drawId}`);
        merged.push(live);
        existingIds.add(live.drawId);
      }
    }

    // Sort descending by drawDate
    merged.sort((a, b) => new Date(b.drawDate).getTime() - new Date(a.drawDate).getTime());

    cachedDraws = merged;
    lastFetchTime = now;
    return merged;
  } catch (error: any) {
    console.error('[LiveScraper Error] Failed to scrape latest draws, falling back to static cache:', error.message);
    
    // Sort descending by drawDate
    baseDraws.sort((a, b) => new Date(b.drawDate).getTime() - new Date(a.drawDate).getTime());
    
    // Fallback to static draws if live fetch fails and no cache exists
    if (!cachedDraws) {
      cachedDraws = baseDraws;
      lastFetchTime = now;
    }
    return cachedDraws;
  }
}
