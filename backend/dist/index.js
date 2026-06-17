"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const ws_1 = require("ws");
const dotenv_1 = __importDefault(require("dotenv"));
const db_js_1 = require("./db.js");
const listener_js_1 = require("./listener.js");
const priceFeeder_js_1 = require("./priceFeeder.js");
const autonomousAction_js_1 = require("./autonomousAction.js");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// ============================================================
//  REST API ENDPOINTS
// ============================================================
/** Fetch paginated alert history with optional category / protocol filters */
app.get('/api/alerts', async (req, res) => {
    try {
        const category = req.query.category;
        const protocol = req.query.protocol;
        const whereClause = {};
        if (category)
            whereClause.category = category;
        if (protocol)
            whereClause.protocol = protocol;
        const alerts = await db_js_1.prisma.alert.findMany({
            where: whereClause,
            include: { report: true },
            orderBy: { timestamp: 'desc' },
            take: 100,
        });
        res.json(alerts);
    }
    catch (error) {
        console.error('Error fetching alerts:', error);
        res.status(500).json({ error: 'Failed to retrieve alerts' });
    }
});
/** Aggregated dashboard statistics and chart payloads */
app.get('/api/stats', async (req, res) => {
    try {
        const alerts = await db_js_1.prisma.alert.findMany({
            include: { report: true },
            orderBy: { timestamp: 'asc' },
        });
        const alertCount = alerts.length;
        const totalTransactions = alertCount * 18 + 1482;
        const activeAlerts = alerts.filter(a => a.riskScore >= 60).length;
        const sumRisk = alerts.reduce((acc, curr) => acc + curr.riskScore, 0);
        const avgRiskScore = alertCount > 0 ? Math.round(sumRisk / alertCount) : 0;
        let protocolHealth = 'Optimal';
        if (avgRiskScore >= 65)
            protocolHealth = 'Critical';
        else if (avgRiskScore >= 35)
            protocolHealth = 'Warning';
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
        const protocolMap = {};
        alerts.forEach(a => {
            if (!protocolMap[a.protocol])
                protocolMap[a.protocol] = { count: 0, volume: 0 };
            protocolMap[a.protocol].count += 1;
            protocolMap[a.protocol].volume += a.amount;
        });
        const protocolStats = Object.keys(protocolMap).map(name => ({
            name,
            alertsCount: protocolMap[name].count,
            volume: Math.round(protocolMap[name].volume),
        }));
        res.json({ totalTransactions, activeAlerts, avgRiskScore, protocolHealth, categoryDistribution, timeSeriesData, protocolStats });
    }
    catch (error) {
        console.error('Error compiling statistics:', error);
        res.status(500).json({ error: 'Failed to retrieve stats' });
    }
});
/** Live SUI/USD oracle price + volatility metrics */
app.get('/api/price', (_req, res) => {
    const price = (0, priceFeeder_js_1.getCurrentPrice)();
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
    res.json((0, autonomousAction_js_1.getMarketStatus)());
});
/** DAO override: resume the market after an AI-triggered pause */
app.post('/api/market-resume', async (req, res) => {
    const reason = req.body.reason || 'DAO manual override — no reason provided';
    const success = await (0, autonomousAction_js_1.executeDAOResume)(reason);
    if (success) {
        res.json({ success: true, message: 'Market resumed via DAO override', reason });
    }
    else {
        res.status(400).json({ success: false, message: 'Market is not currently paused or override failed' });
    }
});
/** Read system settings */
app.get('/api/settings', async (req, res) => {
    try {
        let settings = await db_js_1.prisma.settings.findUnique({ where: { id: 'system_settings' } });
        if (!settings) {
            settings = await db_js_1.prisma.settings.create({
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
    }
    catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});
/** Write system settings */
app.post('/api/settings', async (req, res) => {
    try {
        const { threshold, notificationType, largeTxThreshold, liquidityDrainPct, newWalletAgeHours, enableLargeTxRule, enableDrainRule, enableWalletRule, } = req.body;
        const settings = await db_js_1.prisma.settings.upsert({
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
    }
    catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});
// ============================================================
//  HTTP + WEBSOCKET SERVER
// ============================================================
const server = (0, http_1.createServer)(app);
const wss = new ws_1.WebSocketServer({ server });
const clients = new Set();
wss.on('connection', (ws) => {
    clients.add(ws);
    console.log(`[WS] Client connected. Active: ${clients.size}`);
    // Send current market status immediately on connection
    ws.send(JSON.stringify({ type: 'MARKET_STATUS', data: (0, autonomousAction_js_1.getMarketStatus)() }));
    // Send current price immediately on connection
    ws.send(JSON.stringify({ type: 'PRICE_UPDATE', data: (0, priceFeeder_js_1.getCurrentPrice)() }));
    ws.on('close', () => {
        clients.delete(ws);
        console.log(`[WS] Client disconnected. Active: ${clients.size}`);
    });
});
function broadcast(type, data) {
    const payload = JSON.stringify({ type, data });
    clients.forEach(ws => {
        if (ws.readyState === ws_1.WebSocket.OPEN)
            ws.send(payload);
    });
}
// Forward blockchain alerts to all WS clients
listener_js_1.blockchainListener.onAlert((alert) => broadcast('NEW_ALERT', alert));
// Forward autonomous action events to all WS clients
autonomousAction_js_1.actionEvents.on('paused', (data) => {
    console.log('[WS] Broadcasting MARKET_PAUSED to all clients');
    broadcast('MARKET_PAUSED', data);
});
autonomousAction_js_1.actionEvents.on('resumed', (data) => {
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
    await (0, priceFeeder_js_1.startPriceFeeder)((price) => {
        broadcast('PRICE_UPDATE', {
            symbol: 'SUI/USD',
            price: price.price,
            change1m: price.change1m,
            change5m: price.change5m,
            timestamp: price.timestamp,
        });
    });
    // 2. Start the blockchain event listener / DeFi simulator
    listener_js_1.blockchainListener.start();
});
// Graceful shutdown
process.on('SIGTERM', () => {
    listener_js_1.blockchainListener.stop();
    server.close(() => {
        db_js_1.prisma.$disconnect();
        process.exit(0);
    });
});
