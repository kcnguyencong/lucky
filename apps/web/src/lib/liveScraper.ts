import axios from 'axios';
import * as cheerio from 'cheerio';
import { DrawRecord } from '@lottery/core';
import rawDraws from '../../draws_raw.json';

let cachedDraws: DrawRecord[] | null = null;
let lastFetchTime: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

function parseXosoHTML(html: string): DrawRecord[] {
  const $ = cheerio.load(html);
  const results: DrawRecord[] = [];

  $('.section-content').each((idx, content) => {
    const $content = $(content);
    const table = $content.find('table.table-result');
    if (table.length === 0) return;

    const headerText =
      $content.prevAll('header.section-header').first().text().trim() ||
      $content.closest('section').find('header.section-header').first().text().trim();

    const dateMatch = headerText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!dateMatch) return;

    const [fullMatch, day, month, year] = dateMatch;
    const drawDateStr = `${year}-${month}-${day}T18:30:00.000Z`;
    const drawId = `MB-${year}${month}${day}`;

    const numbers: number[] = [];
    let specialNumber: number | null = null;

    table.find('tr').each((rIdx, tr) => {
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
    console.log('[LiveScraper] Fetching latest draws from xoso.com.vn...');
    const response = await axios.get('https://xoso.com.vn/xo-so-mien-bac/xsmb-p1.html', {
      timeout: 10000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, Gecko) Chrome/125.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    const liveDraws = parseXosoHTML(response.data);
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
    console.error(
      '[LiveScraper Error] Failed to scrape latest draws, falling back to static cache:',
      error.message
    );

    // Sort descending by drawDate
    baseDraws.sort((a, b) => new Date(b.drawDate).getTime() - new Date(a.drawDate).getTime());

    if (!cachedDraws) {
      cachedDraws = baseDraws;
      lastFetchTime = now;
    }
    return cachedDraws;
  }
}
