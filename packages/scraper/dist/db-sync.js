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
exports.DatabaseSync = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const database_1 = require("@lottery/database");
class DatabaseSync {
    jsonOutputPath;
    constructor() {
        const dataDir = path.resolve(__dirname, '../../../../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        this.jsonOutputPath = path.join(dataDir, 'draws_raw.json');
    }
    /**
     * Save array of DrawResults into raw JSON file artifact
     */
    exportToJson(draws) {
        fs.writeFileSync(this.jsonOutputPath, JSON.stringify(draws, null, 2), 'utf8');
        console.log(`[DBSync] Exported ${draws.length} draw records to JSON: ${this.jsonOutputPath}`);
    }
    /**
     * Upsert scraped draws into SQLite database via Prisma
     */
    async upsertToDatabase(draws) {
        let upsertCount = 0;
        for (const draw of draws) {
            try {
                await database_1.prisma.lotteryDraw.upsert({
                    where: { drawId: draw.drawId },
                    update: {
                        lotteryType: draw.lotteryType,
                        drawDate: new Date(draw.drawDate),
                        numbers: JSON.stringify(draw.numbers),
                        bonusNumber: draw.bonusNumber ?? null,
                        jackpotPrize: draw.jackpotPrize ?? null,
                    },
                    create: {
                        drawId: draw.drawId,
                        lotteryType: draw.lotteryType,
                        drawDate: new Date(draw.drawDate),
                        numbers: JSON.stringify(draw.numbers),
                        bonusNumber: draw.bonusNumber ?? null,
                        jackpotPrize: draw.jackpotPrize ?? null,
                    },
                });
                upsertCount++;
            }
            catch (err) {
                console.error(`[DBSync Error] Failed upserting draw ${draw.drawId}:`, err.message);
            }
        }
        console.log(`[DBSync] Successfully upserted ${upsertCount}/${draws.length} records into Database.`);
        return upsertCount;
    }
}
exports.DatabaseSync = DatabaseSync;
