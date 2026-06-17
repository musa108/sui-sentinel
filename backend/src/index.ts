import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import { prisma } from './db.js';
import { blockchainListener } from './listener.js';
import { startPriceFeeder, getCurrentPrice } from './priceFeeder.js';
import { actionEvents, getMarketStatus, executeDAOResume } from './autonomousAction.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ============================================================
//  REST API ENDPOINTS
// ============================================================

/** Fetch paginated alert history with optional category / protocol filters */
app.get('/api/alerts', async (req, res) => {
  try {
    const category = req.query.category as string | undefined;
    const protocol = req.query.protocol as string | undefined;
    const whereClause: any = {};
    if (category) whereClause.category = category;
    if (protocol) whereClause.protocol = protocol;

    const alerts = await prisma.alert.findMany({
      where: whereClause,
      include: { report: true },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
    res.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to retrieve alerts' });
  }
});

/** Aggregated dashboard statistics and chart payloads */
app.get('/api/stats', async (req, res) => {
  try {
    const alerts = await prisma.alert.findMany({
      include: { report: true },
      orderBy: { timestamp: 'asc' },
    });

    const alertCount = alerts.length;
    const totalTransactions = alertCount * 18 + 1482;
    const activeAlerts = alerts.filter(a => a.riskScore >= 60).length;
    const sumRisk = alerts.reduce((acc, curr) => acc + curr.riskScore, 0);
    const avgRiskScore = alertCount > 0 ? Math.round(sumRisk / alertCount) : 0;

    let protocolHealth = 'Optimal';
    if (avgRiskScore >= 65) protocolHealth = 'Critical';
    else if (avgRiskScore >= 35) protocolHealth = 'Warning';

    const categories = ['Low Risk', 'Medium Risk', 'High Risk', 'Critical Risk'];
    const categoryDistribution = categories.map(cat => ({
      name: cat,
      value: alerts.filter(a => a.category === cat).length,
    }));

    const timeSeriesData = alerts.slice(-20).map(a => ({
      time: new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      score: a.riskScore,
      amount: a.amount,
      protocol: a.protocol,
    }));

    const protocolMap: Record<string, { count: number; volume: number }> = {};
    alerts.forEach(a => {
      if (!protocolMap[a.protocol]) protocolMap[a.protocol] = { count: 0, volume: 0 };
      protocolMap[a.protocol].count += 1;
      protocolMap[a.protocol].volume += a.amount;
    });
    const protocolStats = Object.keys(protocolMap).map(name => ({
      name,
      alertsCount: protocolMap[name].count,
      volume: Math.round(protocolMap[name].volume),
    }));

    res.json({ totalTransactions, activeAlerts, avgRiskScore, protocolHealth, categoryDistribution, timeSeriesData, protocolStats });
  } catch (error) {
    console.error('Error compiling statistics:', error);
    res.status(500).json({ error: 'Failed to retrieve stats' });
  }
});

/** Live SUI/USD oracle price + volatility metrics */
app.get('/api/price', (_req, res) => {
  const price = getCurrentPrice();
  res.json({
    symbol: 'SUI/USD',
    price: price.price,
    change1m: price.change1m,
    change5m: price.change5m,
    timestamp: price.timestamp,
    source: 'Pyth Network Hermes',
  });
});

/** Current market pause status (for DAO override UI) */
app.get('/api/market-status', (_req, res) => {
  res.json(getMarketStatus());
});

/** DAO override: resume the market after an AI-triggered pause */
app.post('/api/market-resume', async (req, res) => {
  const reason = (req.body.reason as string) || 'DAO manual override — no reason provided';
  const success = await executeDAOResume(reason);
  if (success) {
    res.json({ success: true, message: 'Market resumed via DAO override', reason });
  } else {
    res.status(400).json({ success: false, message: 'Market is not currently paused or override failed' });
  }
});

/** Read system settings */
app.get('/api/settings', async (req, res) => {
  try {
    let settings = await prisma.settings.findUnique({ where: { id: 'system_settings' } });
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          id: 'system_settings',
          threshold: 80,
          notificationType: 'all',
          largeTxThreshold: 100000,
          liquidityDrainPct: 20,
          newWalletAgeHours: 24,
          enableLargeTxRule: true,
          enableDrainRule: true,
          enableWalletRule: true,
        },
      });
    }
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/** Write system settings */
app.post('/api/settings', async (req, res) => {
  try {
    const {
      threshold, notificationType, largeTxThreshold,
      liquidityDrainPct, newWalletAgeHours,
      enableLargeTxRule, enableDrainRule, enableWalletRule,
    } = req.body;

    const settings = await prisma.settings.upsert({
      where: { id: 'system_settings' },
      update: {
        threshold: threshold !== undefined ? Number(threshold) : undefined,
        notificationType,
        largeTxThreshold: largeTxThreshold !== undefined ? Number(largeTxThreshold) : undefined,
        liquidityDrainPct: liquidityDrainPct !== undefined ? Number(liquidityDrainPct) : undefined,
        newWalletAgeHours: newWalletAgeHours !== undefined ? Number(newWalletAgeHours) : undefined,
        enableLargeTxRule,
        enableDrainRule,
        enableWalletRule,
      },
      create: {
        id: 'system_settings',
        threshold: Number(threshold ?? 80),
        notificationType: notificationType ?? 'all',
        largeTxThreshold: Number(largeTxThreshold ?? 100000),
        liquidityDrainPct: Number(liquidityDrainPct ?? 20),
        newWalletAgeHours: Number(newWalletAgeHours ?? 24),
        enableLargeTxRule: enableLargeTxRule ?? true,
        enableDrainRule: enableDrainRule ?? true,
        enableWalletRule: enableWalletRule ?? true,
      },
    });
    res.json({ message: 'Settings saved successfully', settings });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ============================================================
//  HTTP + WEBSOCKET SERVER
// ============================================================

const server = createServer(app);
const wss = new WebSocketServer({ server });
const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[WS] Client connected. Active: ${clients.size}`);

  // Send current market status immediately on connection
  ws.send(JSON.stringify({ type: 'MARKET_STATUS', data: getMarketStatus() }));

  // Send current price immediately on connection
  ws.send(JSON.stringify({ type: 'PRICE_UPDATE', data: getCurrentPrice() }));

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WS] Client disconnected. Active: ${clients.size}`);
  });
});

function broadcast(type: string, data: any) {
  const payload = JSON.stringify({ type, data });
  clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  });
}

// Forward blockchain alerts to all WS clients
blockchainListener.onAlert((alert) => broadcast('NEW_ALERT', alert));

// Forward autonomous action events to all WS clients
actionEvents.on('paused', (data) => {
  console.log('[WS] Broadcasting MARKET_PAUSED to all clients');
  broadcast('MARKET_PAUSED', data);
});

actionEvents.on('resumed', (data) => {
  console.log('[WS] Broadcasting MARKET_RESUMED to all clients');
  broadcast('MARKET_RESUMED', data);
});

// ============================================================
//  BOOT SEQUENCE
// ============================================================

server.listen(port, async () => {
  console.log(`\n${'─'.repeat(55)}`);
  console.log(` Sui Sentinel — Autonomous DeFi Risk Agent`);
  console.log(` Backend running at http://localhost:${port}`);
  console.log(`${'─'.repeat(55)}`);

  // 1. Start the Pyth price oracle feeder
  await startPriceFeeder((price) => {
    broadcast('PRICE_UPDATE', {
      symbol: 'SUI/USD',
      price: price.price,
      change1m: price.change1m,
      change5m: price.change5m,
      timestamp: price.timestamp,
    });
  });

  // 2. Start the blockchain event listener / DeFi simulator
  blockchainListener.start();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  blockchainListener.stop();
  server.close(() => {
    prisma.$disconnect();
    process.exit(0);
  });
});
