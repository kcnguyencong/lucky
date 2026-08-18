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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path = __importStar(require("path"));
const scraper_1 = require("./scraper");
const db_sync_1 = require("./db-sync");
// Load environment variables from workspace root or .env
dotenv_1.default.config({ path: path.resolve(__dirname, '../../../../.env') });
async function main() {
    console.log('====================================================');
    console.log('🎯 Starting Lottery Scraper & Ingestion Module');
    console.log('====================================================');
    const scraper = new scraper_1.LotteryScraper();
    const dbSync = new db_sync_1.DatabaseSync();
    // Scrape XSMB results (labeled as MEGA_645 for web compatibility)
    const draws = await scraper.runScrape('MEGA_645');
    // Deduplicate by drawId to ensure clean data
    const uniqueDrawsMap = new Map();
    draws.forEach((d) => uniqueDrawsMap.set(d.drawId, d));
    const uniqueDraws = Array.from(uniqueDrawsMap.values());
    // 1. Export raw JSON artifact
    dbSync.exportToJson(uniqueDraws);
    // 2. Upsert data into local SQLite database via Prisma ORM
    await dbSync.upsertToDatabase(uniqueDraws);
    console.log('====================================================');
    console.log('✅ Scraper pipeline completed successfully!');
    console.log('====================================================');
}
main().catch((err) => {
    console.error('❌ Scraper module pipeline error:', err);
    process.exit(1);
});
