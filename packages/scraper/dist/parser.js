"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrawParser = void 0;
const cheerio = __importStar(require("cheerio"));
/**
 * Parser chuyên nghiệp bóc tách HTML từ mketqua.net/so-ket-qua
 */
class DrawParser {
    /**
     * Parse HTML từ mketqua.net thành mảng kết quả xổ số chuẩn hóa
     */
    static parseHTML(html, lotteryType = 'XSMB') {
        const $ = cheerio.load(html);
        const results = [];
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
            const numbers = [];
            let specialNumber = undefined;
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
    static generateMockDrawHistory(lotteryType = 'XSMB', totalDraws = 60) {
        const mockResults = [];
        const baseDate = new Date();
        for (let i = 0; i < totalDraws; i++) {
            const drawDate = new Date(baseDate.valueOf() - i * 24 * 60 * 60 * 1000);
            const dateKey = drawDate.toISOString().substring(0, 10).replace(/-/g, '');
            const drawId = `MB-${dateKey}`;
            const numbers = [];
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
exports.DrawParser = DrawParser;
