"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const database_1 = require("@lottery/database");
const core_1 = require("@lottery/core");
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../../.env') });
const server = (0, fastify_1.default)({ logger: true });
server.register(cors_1.default, {
    origin: true,
});
// Helper: transform DB LotteryDraw to DrawRecord format
function formatDrawRecord(draw) {
    let numbersArr = [];
    try {
        numbersArr = typeof draw.numbers === 'string' ? JSON.parse(draw.numbers) : draw.numbers;
    }
    catch (e) {
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
server.get('/health', async () => {
    return { status: 'ok', timestamp: new Date() };
});
// GET /api/summary - High level KPI Overview
server.get('/api/summary', async (request, reply) => {
    const dbDraws = await database_1.prisma.lotteryDraw.findMany({
        orderBy: { drawDate: 'desc' },
    });
    const draws = dbDraws.map(formatDrawRecord);
    const summary = (0, core_1.generateOverviewSummary)(draws);
    return { success: true, data: summary };
});
// GET /api/draws - Paginated draw list with search
server.get('/api/draws', async (request, reply) => {
    const { page = '1', limit = '20', lotteryType } = request.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    const where = {};
    if (lotteryType) {
        where.lotteryType = lotteryType;
    }
    const [total, items] = await Promise.all([
        database_1.prisma.lotteryDraw.count({ where }),
        database_1.prisma.lotteryDraw.findMany({
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
    const dbDraws = await database_1.prisma.lotteryDraw.findMany({
        orderBy: { drawDate: 'desc' },
    });
    const draws = dbDraws.map(formatDrawRecord);
    const stats = (0, core_1.calculateFrequencyStats)(draws, 99);
    return { success: true, data: stats };
});
// GET /api/stats/gap - Omission gap stats for 00-99
server.get('/api/stats/gap', async (request, reply) => {
    const dbDraws = await database_1.prisma.lotteryDraw.findMany({
        orderBy: { drawDate: 'desc' },
    });
    const draws = dbDraws.map(formatDrawRecord);
    const stats = (0, core_1.calculateGapStats)(draws, 99);
    return { success: true, data: stats };
});
// GET /api/stats/pairs - Top co-occurring pairs
server.get('/api/stats/pairs', async (request, reply) => {
    const dbDraws = await database_1.prisma.lotteryDraw.findMany({
        orderBy: { drawDate: 'desc' },
    });
    const draws = dbDraws.map(formatDrawRecord);
    const pairs = (0, core_1.calculateTopPairs)(draws, 15);
    return { success: true, data: pairs };
});
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
const start = async () => {
    try {
        await server.listen({ port: PORT, host: '0.0.0.0' });
        console.log(`🚀 Fastify Lottery API running on http://localhost:${PORT}`);
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
start();
