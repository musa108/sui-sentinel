"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionEvents = void 0;
exports.isMarketPaused = isMarketPaused;
exports.getMarketStatus = getMarketStatus;
exports.setMarketResumed = setMarketResumed;
exports.executeEmergencyPause = executeEmergencyPause;
exports.executeDAOResume = executeDAOResume;
const events_1 = require("events");
const client_1 = require("@mysten/sui/client");
const transactions_1 = require("@mysten/sui/transactions");
const ed25519_1 = require("@mysten/sui/keypairs/ed25519");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// ======= Module State =======
let marketPaused = false;
let lastPauseDigest = null;
let lastPauseScore = 0;
let lastPauseTimestamp = null;
// EventEmitter so index.ts can forward events to WebSocket clients
exports.actionEvents = new events_1.EventEmitter();
// ======= State Accessors =======
function isMarketPaused() {
    return marketPaused;
}
function getMarketStatus() {
    return {
        isPaused: marketPaused,
        lastPauseDigest,
        lastPauseScore,
        lastPauseTimestamp,
        suiscanUrl: lastPauseDigest && !lastPauseDigest.startsWith('SIMULATED')
            ? `https://suiscan.xyz/testnet/tx/${lastPauseDigest}`
            : null,
    };
}
function setMarketResumed() {
    marketPaused = false;
    lastPauseDigest = null;
    lastPauseScore = 0;
    lastPauseTimestamp = null;
    console.log('[AutonomousAction] Market resumed via DAO override.');
    exports.actionEvents.emit('resumed', { timestamp: Date.now() });
}
// ======= Core PTB Action =======
/**
 * Autonomous on-chain action: trigger a market pause via Programmable Transaction Block.
 *
 * Runs in two modes:
 * - SIMULATION: When SUI_PACKAGE_ID is not configured (for demo / hackathon judges)
 * - LIVE:       When all environment variables are set and contract is deployed
 *
 * Called automatically when finalRiskScore >= 90 in riskEngine.ts
 */
async function executeEmergencyPause(riskScore) {
    if (marketPaused) {
        console.log('[AutonomousAction] Market already paused — skipping duplicate.');
        return null;
    }
    const packageId = process.env.SUI_PACKAGE_ID;
    const alertStoreId = process.env.SUI_ALERT_STORE_ID;
    const privateKeyB64 = process.env.AGENT_PRIVATE_KEY;
    // ---- SIMULATION MODE ----
    if (!packageId || !alertStoreId || !privateKeyB64) {
        marketPaused = true;
        lastPauseScore = riskScore;
        lastPauseTimestamp = Date.now();
        const mockDigest = `SIMULATED_PAUSE_${Date.now().toString(16).toUpperCase()}`;
        lastPauseDigest = mockDigest;
        const banner = '='.repeat(65);
        console.log(`\n${banner}`);
        console.log('[AutonomousAction] 🚨  EMERGENCY MARKET PAUSE TRIGGERED  🚨');
        console.log(`[AutonomousAction] Risk Score : ${riskScore}/100`);
        console.log(`[AutonomousAction] Mode       : SIMULATION (deploy contract to go live)`);
        console.log(`[AutonomousAction] Mock Digest: ${mockDigest}`);
        console.log(`[AutonomousAction] To activate live mode, set in backend/.env:`);
        console.log(`[AutonomousAction]   SUI_PACKAGE_ID=0x<your_package_id>`);
        console.log(`[AutonomousAction]   SUI_ALERT_STORE_ID=0x<alert_store_object_id>`);
        console.log(`[AutonomousAction]   AGENT_PRIVATE_KEY=<base64_ed25519_key>`);
        console.log(`${banner}\n`);
        exports.actionEvents.emit('paused', {
            digest: mockDigest,
            riskScore,
            simulated: true,
            timestamp: lastPauseTimestamp,
        });
        return mockDigest;
    }
    // ---- LIVE MODE (contract deployed) ----
    try {
        const keypair = ed25519_1.Ed25519Keypair.fromSecretKey(Buffer.from(privateKeyB64, 'base64'));
        const client = new client_1.SuiClient({
            url: process.env.SUI_RPC_URL || (0, client_1.getFullnodeUrl)('testnet'),
        });
        // Build the Programmable Transaction Block (PTB)
        const tx = new transactions_1.Transaction();
        tx.moveCall({
            target: `${packageId}::risk_compliance::trigger_market_pause`,
            arguments: [
                tx.object(alertStoreId),
                tx.pure.u64(riskScore),
            ],
        });
        tx.setGasBudget(10_000_000);
        const result = await client.signAndExecuteTransaction({
            signer: keypair,
            transaction: tx,
        });
        marketPaused = true;
        lastPauseScore = riskScore;
        lastPauseTimestamp = Date.now();
        lastPauseDigest = result.digest;
        const banner = '='.repeat(65);
        console.log(`\n${banner}`);
        console.log('[AutonomousAction] 🚨  ON-CHAIN MARKET PAUSE EXECUTED  🚨');
        console.log(`[AutonomousAction] Risk Score : ${riskScore}/100`);
        console.log(`[AutonomousAction] Tx Digest  : ${result.digest}`);
        console.log(`[AutonomousAction] Suiscan    : https://suiscan.xyz/testnet/tx/${result.digest}`);
        console.log(`${banner}\n`);
        exports.actionEvents.emit('paused', {
            digest: result.digest,
            riskScore,
            simulated: false,
            timestamp: lastPauseTimestamp,
        });
        return result.digest;
    }
    catch (err) {
        console.error('[AutonomousAction] ❌ Failed to execute on-chain pause:', err);
        return null;
    }
}
/**
 * DAO override: resume the market via backend API call.
 * In live mode, calls dao_override_resume() on the Move contract.
 * In simulation mode, simply resets local state.
 */
async function executeDAOResume(reason) {
    if (!marketPaused)
        return false;
    const packageId = process.env.SUI_PACKAGE_ID;
    const alertStoreId = process.env.SUI_ALERT_STORE_ID;
    const privateKeyB64 = process.env.AGENT_PRIVATE_KEY;
    if (!packageId || !alertStoreId || !privateKeyB64) {
        // Simulation mode
        setMarketResumed();
        console.log(`[AutonomousAction] DAO Override (SIMULATION) applied. Reason: "${reason}"`);
        return true;
    }
    try {
        const keypair = ed25519_1.Ed25519Keypair.fromSecretKey(Buffer.from(privateKeyB64, 'base64'));
        const client = new client_1.SuiClient({
            url: process.env.SUI_RPC_URL || (0, client_1.getFullnodeUrl)('testnet'),
        });
        const tx = new transactions_1.Transaction();
        tx.moveCall({
            target: `${packageId}::risk_compliance::dao_override_resume`,
            arguments: [
                tx.object(process.env.SUI_DAO_CAP_ID),
                tx.object(alertStoreId),
                tx.pure.string(reason),
            ],
        });
        tx.setGasBudget(10_000_000);
        await client.signAndExecuteTransaction({ signer: keypair, transaction: tx });
        setMarketResumed();
        return true;
    }
    catch (err) {
        console.error('[AutonomousAction] ❌ DAO override failed:', err);
        return false;
    }
}
