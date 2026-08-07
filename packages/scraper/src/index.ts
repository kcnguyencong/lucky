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

  // Scrape MEGA_645 and POWER_655 results
  const megaDraws = await scraper.runScrape('MEGA_645');
  const powerDraws = await scraper.runScrape('POWER_655');

  const allDraws = [...megaDraws, ...powerDraws];

  // 1. Export raw JSON artifact
  dbSync.exportToJson(allDraws);

  // 2. Upsert data into local SQLite database via Prisma ORM
  await dbSync.upsertToDatabase(allDraws);

  console.log('====================================================');
  console.log('✅ Scraper pipeline completed successfully!');
  console.log('====================================================');
}

main().catch((err) => {
  console.error('❌ Scraper module pipeline error:', err);
  process.exit(1);
});
