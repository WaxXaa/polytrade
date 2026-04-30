/**
 * HTTP server — Express REST API for the frontend.
 *
 * Endpoints:
 *   GET  /api/status        — agent status
 *   GET  /api/positions     — open positions
 *   GET  /api/history       — trade history (last 100)
 *   GET  /api/metrics       — daily metrics
 *   POST /api/config        — update risk configuration
 *   POST /api/agent/start   — start the agent
 *   POST /api/agent/stop    — stop the agent
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import { db, openPosition, tradeHistory, dailyMetrics, userConfig } from '../db/index';
import { desc, eq } from 'drizzle-orm';
import type { AgentCore } from '../services/agent-core';

export function createHttpServer(agent: AgentCore) {
  const app = express();

  // ─── Middleware ──────────────────────────────────────────────────────────────

  app.use(express.json());

  // CORS — allow frontend dev server
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });

  app.options('*', (_req: Request, res: Response) => {
    res.sendStatus(204);
  });

  // ─── Routes ──────────────────────────────────────────────────────────────────

  app.get('/api/status', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      paperMode: agent.isPaperMode(),
    });
  });

  app.get('/api/traders', (_req: Request, res: Response) => {
    res.json(agent.getTopTraders());
  });

  app.get('/api/positions', async (_req: Request, res: Response) => {
    try {
      const rows = await db.select().from(openPosition);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get('/api/history', async (_req: Request, res: Response) => {
    try {
      const rows = await db
        .select()
        .from(tradeHistory)
        .orderBy(desc(tradeHistory.timestamp))
        .limit(100);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get('/api/metrics', async (_req: Request, res: Response) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const rows = await db
        .select()
        .from(dailyMetrics)
        .where(eq(dailyMetrics.date, today))
        .limit(1);
      res.json(rows[0] ?? null);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post('/api/config', async (req: Request, res: Response) => {
    const body = req.body as {
      maxExposurePercent?: number;
      stopLossPercent?: number;
      maxTradesPerHour?: number;
      maxPositionPercent?: number;
    };

    const {
      maxExposurePercent,
      stopLossPercent,
      maxTradesPerHour,
      maxPositionPercent,
    } = body;

    if (
      typeof maxExposurePercent !== 'number' ||
      typeof stopLossPercent !== 'number' ||
      typeof maxTradesPerHour !== 'number' ||
      typeof maxPositionPercent !== 'number'
    ) {
      res.status(400).json({ error: 'All config fields are required and must be numbers.' });
      return;
    }

    try {
      const updatedAt = new Date().toISOString();

      await db
        .insert(userConfig)
        .values({ id: 'default', maxExposurePercent, stopLossPercent, maxTradesPerHour, maxPositionPercent, updatedAt })
        .onConflictDoUpdate({
          target: userConfig.id,
          set: { maxExposurePercent, stopLossPercent, maxTradesPerHour, maxPositionPercent, updatedAt },
        });

      // Apply to running agent
      agent.updateRiskConfig({
        maxExposurePercent,
        stopLossPercent,
        maxTradesPerHour,
        maxPositionPercent,
        minTradeAmount: 1,
        minBalance: 5,
      });

      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post('/api/agent/start', async (req: Request, res: Response) => {
    const { walletAddress, balance } = req.body as { walletAddress?: string; balance?: number };

    if (!walletAddress || typeof balance !== 'number') {
      res.status(400).json({ error: 'walletAddress and balance are required.' });
      return;
    }

    try {
      await agent.start(walletAddress, balance);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post('/api/agent/stop', (_req: Request, res: Response) => {
    agent.stop();
    res.json({ ok: true });
  });

  return app;
}

