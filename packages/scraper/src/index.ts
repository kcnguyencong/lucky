import dotenv from 'dotenv';
import * as path from 'path';
import { LotteryScraper } from './scraper';
import { DatabaseSync } from './db-sync';

// Load environment variables from workspace root or .env
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function main() {
  console.log('====================================================');
  console.log('🎯 Starting Lottery Scraper & Ingestion Module');
  console.log('====================================================');

  const scraper = new LotteryScraper();
  const dbSync = new DatabaseSync();

  // Scrape XSMB results (labeled as XSMB)
  const drawsMB = await scraper.runScrape('XSMB');

  // Scrape Vietlott Mega 6/45
  const drawsMega = await scraper.runScrape('MEGA_645');

  // Scrape Vietlott Power 6/55
  const drawsPower = await scraper.runScrape('POWER_655');

  const allDraws = [...drawsMB, ...drawsMega, ...drawsPower];

  // Deduplicate by drawId to ensure clean data
  const uniqueDrawsMap = new Map<string, typeof allDraws[0]>();
  allDraws.forEach((d) => uniqueDrawsMap.set(d.drawId, d));
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
