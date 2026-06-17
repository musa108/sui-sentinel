"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentPrice = getCurrentPrice;
exports.startPriceFeeder = startPriceFeeder;
exports.getPriceVolatilityScore = getPriceVolatilityScore;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Pyth Hermes public REST API — no API key required
const PYTH_HERMES_URL = "https://hermes.pyth.network/v2/updates/price/latest";
// Official SUI/USD price feed ID on Pyth Network
// Source: https://pyth.network/price-feeds/crypto-sui-usd
const SUI_PRICE_FEED_ID = "0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744";
// Rolling history — stores price samples every 15 seconds
const priceHistory = [];
// Module-level state
let currentPricePoint = {
    price: 3.45,
    timestamp: Date.now(),
    change1m: 0,
    change5m: 0,
};
function getCurrentPrice() {
    return currentPricePoint;
}
// Fetch real price from Pyth Hermes API
async function fetchPythPrice() {
    try {
        const url = `${PYTH_HERMES_URL}?ids[]=${SUI_PRICE_FEED_ID}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok)
            return null;
        const data = await res.json();
        const parsed = data?.parsed?.[0];
        if (!parsed?.price?.price || !parsed?.price?.expo)
            return null;
        const rawPrice = Number(parsed.price.price);
        const expo = Number(parsed.price.expo);
        const price = rawPrice * Math.pow(10, expo);
        // Sanity check — SUI should be between $0.01 and $1000
        if (price < 0.01 || price > 1000)
            return null;
        return price;
    }
    catch {
        return null;
    }
}
// Simulate realistic DeFi market price movements when Pyth is unavailable
function simulatePrice() {
    const last = priceHistory[priceHistory.length - 1]?.price ?? 3.45;
    // Mostly small random drift, rare large swings for demo realism
    const dice = Math.random();
    let drift = (Math.random() - 0.5) * 0.008; // ±0.4% normally
    if (dice < 0.02) {
        drift = -(0.05 + Math.random() * 0.10); // -5% to -15% flash crash sim
    }
    else if (dice < 0.04) {
        drift = 0.03 + Math.random() * 0.05; // +3% to +8% bounce sim
    }
    return Math.max(0.01, last * (1 + drift));
}
// Compute % change from a rolling history point N ms ago
function pctChange(nowPrice, nowTs, ageMs) {
    const target = priceHistory.find(p => nowTs - p.timestamp >= ageMs);
    if (!target)
        return 0;
    return ((nowPrice - target.price) / target.price) * 100;
}
/**
 * Start the Pyth oracle price feeder.
 * Polls every 15 seconds and calls the provided callback with each update.
 */
async function startPriceFeeder(onPriceUpdate) {
    console.log("[PriceFeeder] Starting Pyth oracle feed for SUI/USD...");
    async function poll() {
        const now = Date.now();
        let price = await fetchPythPrice();
        const source = price !== null ? "PYTH LIVE" : "SIMULATOR";
        if (price === null)
            price = simulatePrice();
        // Push to rolling 10-minute window (15s * 40 = 600s = 10min)
        priceHistory.push({ price, timestamp: now });
        if (priceHistory.length > 40)
            priceHistory.shift();
        const change1m = pctChange(price, now, 60_000);
        const change5m = pctChange(price, now, 300_000);
        currentPricePoint = { price, timestamp: now, change1m, change5m };
        onPriceUpdate(currentPricePoint);
        console.log(`[PriceFeeder][${source}] SUI/USD: $${price.toFixed(4)} | ` +
            `Δ1m: ${change1m >= 0 ? "+" : ""}${change1m.toFixed(2)}% | ` +
            `Δ5m: ${change5m >= 0 ? "+" : ""}${change5m.toFixed(2)}%`);
    }
    await poll();
    setInterval(poll, 15_000);
}
/**
 * Translate current price volatility into a deterministic risk score contribution.
 * This is the bridge between the oracle feed and the AI risk model.
 *
 * Scoring:
 *  - De-peg (SUI -25%+ in 5m) → +50 pts, Critical
 *  - Flash Crash (SUI -15%+ in 5m) → +35 pts, High
 *  - Spike Down (SUI -5%+ in 5m) → +15 pts, Low
 */
function getPriceVolatilityScore(price) {
    const drop5m = -price.change5m; // Positive value = price fell
    if (drop5m >= 25) {
        return {
            score: 50,
            triggered: true,
            severity: 'critical',
            label: `De-peg Event detected — SUI/USD dropped ${drop5m.toFixed(1)}% in 5 min`,
        };
    }
    if (drop5m >= 15) {
        return {
            score: 35,
            triggered: true,
            severity: 'high',
            label: `Flash Crash — SUI/USD dropped ${drop5m.toFixed(1)}% in 5 min`,
        };
    }
    if (drop5m >= 5) {
        return {
            score: 15,
            triggered: true,
            severity: 'low',
            label: `Price Spike Down — SUI/USD dropped ${drop5m.toFixed(1)}% in 5 min`,
        };
    }
    return { score: 0, triggered: false, severity: 'none', label: '' };
}
