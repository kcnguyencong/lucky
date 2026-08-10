import fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import path from 'path';
import { prisma } from '@lottery/database';
import {
  calculateFrequencyStats,
  calculateGapStats,
  calculateTopPairs,
  generateOverviewSummary,
  DrawRecord,
} from '@lottery/core';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const server = fastify({ logger: true });

server.register(cors, {
  origin: true,
});

// Helper: transform DB LotteryDraw to DrawRecord format
function formatDrawRecord(draw: any): DrawRecord {
  let numbersArr: number[] = [];
  try {
    numbersArr = typeof draw.numbers === 'string' ? JSON.parse(draw.numbers) : draw.numbers;
  } catch (e) {
    numbersArr = [];
  }
  return {
    id: draw.id,
    drawId: draw.drawId,
    lotteryType: draw.lotteryType,
    drawDate: draw.drawDate,
    numbers: numbersArr,
    bonusNumber: draw.bonusNumber,
  };
}

// Routes
server.get('/', async (request, reply) => {
  return reply.send({
    name: 'Lottery Analytics Engine API',
    status: 'online',
    endpoints: {
      summary: '/api/summary',
      draws: '/api/draws',
      frequencyStats: '/api/stats/frequency',
      gapStats: '/api/stats/gap',
      pairsStats: '/api/stats/pairs'
    }
  });
});

server.get('/health', async () => {
  return { status: 'ok', timestamp: new Date() };
});

// GET /api/summary - High level KPI Overview
server.get('/api/summary', async (request, reply) => {
  const dbDraws = await prisma.lotteryDraw.findMany({
    orderBy: { drawDate: 'desc' },
  });
  const draws = dbDraws.map(formatDrawRecord);
  const summary = generateOverviewSummary(draws);
  return { success: true, data: summary };
});

// GET /api/draws - Paginated draw list with search
server.get('/api/draws', async (request, reply) => {
  const { page = '1', limit = '20', lotteryType } = request.query as any;
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};
  if (lotteryType) {
    where.lotteryType = lotteryType;
  }

  const [total, items] = await Promise.all([
    prisma.lotteryDraw.count({ where }),
    prisma.lotteryDraw.findMany({
      where,
      orderBy: { drawDate: 'desc' },
      skip,
      take: limitNum,
    }),
  ]);

  return {
    success: true,
    data: items.map(formatDrawRecord),
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
});

// GET /api/stats/frequency - Frequency stats for 00-99
server.get('/api/stats/frequency', async (request, reply) => {
  const dbDraws = await prisma.lotteryDraw.findMany({
    orderBy: { drawDate: 'desc' },
  });
  const draws = dbDraws.map(formatDrawRecord);
  const stats = calculateFrequencyStats(draws, 99);
  return { success: true, data: stats };
});

// GET /api/stats/gap - Omission gap stats for 00-99
server.get('/api/stats/gap', async (request, reply) => {
  const dbDraws = await prisma.lotteryDraw.findMany({
    orderBy: { drawDate: 'desc' },
  });
  const draws = dbDraws.map(formatDrawRecord);
  const stats = calculateGapStats(draws, 99);
  return { success: true, data: stats };
});

// GET /api/stats/pairs - Top co-occurring pairs
server.get('/api/stats/pairs', async (request, reply) => {
  const dbDraws = await prisma.lotteryDraw.findMany({
    orderBy: { drawDate: 'desc' },
  });
  const draws = dbDraws.map(formatDrawRecord);
  const pairs = calculateTopPairs(draws, 15);
  return { success: true, data: pairs };
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

const start = async () => {
  try {
    await server.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🚀 Fastify Lottery API running on http://localhost:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
