import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '@lottery/database';
import { DrawResult } from './types';

export class DatabaseSync {
  private jsonOutputPath: string;

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
  public exportToJson(draws: DrawResult[]): void {
    fs.writeFileSync(this.jsonOutputPath, JSON.stringify(draws, null, 2), 'utf8');
    console.log(`[DBSync] Exported ${draws.length} draw records to JSON: ${this.jsonOutputPath}`);
  }

  /**
   * Upsert scraped draws into SQLite database via Prisma
   */
  public async upsertToDatabase(draws: DrawResult[]): Promise<number> {
    let upsertCount = 0;

    for (const draw of draws) {
      try {
        await prisma.lotteryDraw.upsert({
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
      } catch (err: any) {
        console.error(`[DBSync Error] Failed upserting draw ${draw.drawId}:`, err.message);
      }
    }

    console.log(`[DBSync] Successfully upserted ${upsertCount}/${draws.length} records into Database.`);
    return upsertCount;
  }
}
