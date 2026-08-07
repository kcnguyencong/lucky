import * as cheerio from 'cheerio';
import { DrawResult } from './types';

/**
 * Parser chuyên nghiệp bóc tách HTML từ mketqua.net/so-ket-qua
 */
export class DrawParser {
  /**
   * Parse HTML từ mketqua.net thành mảng kết quả xổ số chuẩn hóa
   */
  public static parseHTML(html: string, lotteryType: string = 'XSMB'): DrawResult[] {
    const $ = cheerio.load(html);
    const results: DrawResult[] = [];

    // Duyệt qua từng khung kết quả (.kqbackground / #result_tab_mb)
    $('#result_tab_mb').each((idx, table) => {
      const $table = $(table);
      
      // 1. Bóc tách Ngày quay thưởng (vd: "Thứ hai ngày 03-08-2026")
      const dateText = $table.find('#result_date').text().trim();
      let drawDateStr = new Date().toISOString();
      if (dateText) {
        const match = dateText.match(/(\d{2})-(\d{2})-(\d{4})/);
        if (match) {
          const [_, day, month, year] = match;
          drawDateStr = new Date(`${year}-${month}-${day}T18:30:00.000Z`).toISOString();
        }
      }

      // 2. Tạo drawId duy nhất dựa trên ngày
      const dateKey = drawDateStr.substring(0, 10).replace(/-/g, '');
      const drawId = `MB-${dateKey}`;

      // 3. Bóc tách danh sách tất cả các số trúng thưởng trong bảng
      const numbers: number[] = [];
      let specialNumber: number | undefined = undefined;

      // Giải Đặc biệt (rs_0_0)
      const specialText = $table.find('#rs_0_0').text().trim();
      if (specialText && specialText.length >= 2) {
        // Lấy 2 số cuối (lô đặc biệt / đề)
        const dbLotto = parseInt(specialText.slice(-2), 10);
        if (!isNaN(dbLotto)) {
          specialNumber = dbLotto;
          numbers.push(dbLotto);
        }
      }

      // Lấy toàn bộ kết quả các giải khác (Lô 2 chữ số cuối)
      $table.find('div[id^="rs_"]').each((_, numDiv) => {
        const numText = $(numDiv).text().trim();
        if (numText && numText.length >= 2 && !$(numDiv).attr('id')?.startsWith('rs_8')) {
          // Bỏ qua dòng ký tự (rs_8)
          const lottoNum = parseInt(numText.slice(-2), 10);
          if (!isNaN(lottoNum)) {
            numbers.push(lottoNum);
          }
        }
      });

      if (numbers.length > 0) {
        results.push({
          drawId,
          lotteryType,
          drawDate: drawDateStr,
          numbers: numbers, // Mảng các lô tô về trong ngày quay
          bonusNumber: specialNumber,
        });
      }
    });

    return results;
  }

  /**
   * Tạo dữ liệu giả định nếu cào web bị lỗi kết nối
   */
  public static generateMockDrawHistory(lotteryType: string = 'XSMB', totalDraws: number = 60): DrawResult[] {
    const mockResults: DrawResult[] = [];
    const baseDate = new Date();

    for (let i = 0; i < totalDraws; i++) {
      const drawDate = new Date(baseDate.valueOf() - i * 24 * 60 * 60 * 1000);
      const dateKey = drawDate.toISOString().substring(0, 10).replace(/-/g, '');
      const drawId = `MB-${dateKey}`;

      const numbers: number[] = [];
      for (let k = 0; k < 27; k++) {
        numbers.push(Math.floor(Math.random() * 100));
      }

      mockResults.push({
        drawId,
        lotteryType,
        drawDate: drawDate.toISOString(),
        numbers: numbers,
        bonusNumber: numbers[0],
      });
    }

    return mockResults;
  }
}
