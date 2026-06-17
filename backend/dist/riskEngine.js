"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processTransaction = processTransaction;
const db_js_1 = require("./db.js");
const aiService_js_1 = require("./aiService.js");
const notifier_js_1 = require("./notifier.js");
const priceFeeder_js_1 = require("./priceFeeder.js");
const autonomousAction_js_1 = require("./autonomousAction.js");
/**
 * Process a DeFi transaction through the full hybrid risk pipeline:
 * 1. Fetch system settings
 * 2. Run Rule-Based Detection (large tx, liquidity drain, new wallet, PRICE VOLATILITY)
 * 3. Run AI analysis
 * 4. Compute: Final Score = (AI * 0.6) + (Rules * 0.4)
 * 5. Persist to DB
 * 6. Trigger autonomous on-chain pause if score >= 90
 * 7. Dispatch notifications
 */
async function processTransaction(tx) {
    // ---- 1. Load settings ----
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
    // ---- 2. Rule-Based Detection Engine ----
    let ruleScore = 0;
    const triggeredRules = [];
    // Rule A: Large Transaction
    if (settings.enableLargeTxRule && tx.amount >= settings.largeTxThreshold) {
        ruleScore += 40;
        triggeredRules.push(`Large Transaction (${tx.amount.toLocaleString()} ${tx.token} > $${settings.largeTxThreshold.toLocaleString()} threshold)`);
    }
    // Rule B: Liquidity Drain
    if (settings.enableDrainRule &&
        tx.poolTvlChangePct !== undefined &&
        Math.abs(tx.poolTvlChangePct) >= settings.liquidityDrainPct) {
        ruleScore += 35;
        triggeredRules.push(`Pool Liquidity Drain (${Math.abs(tx.poolTvlChangePct).toFixed(1)}% TVL reduction > ${settings.liquidityDrainPct}% threshold)`);
    }
    // Rule C: Fresh/Sybil Wallet
    if (settings.enableWalletRule &&
        tx.walletAgeHours !== undefined &&
        tx.walletAgeHours < settings.newWalletAgeHours) {
        ruleScore += 25;
        triggeredRules.push(`Sybil Wallet (age: ${tx.walletAgeHours}h < ${settings.newWalletAgeHours}h minimum)`);
    }
    // Rule D: LIVE PYTH ORACLE — Price Volatility (NEW)
    const currentPrice = (0, priceFeeder_js_1.getCurrentPrice)();
    const priceVol = (0, priceFeeder_js_1.getPriceVolatilityScore)(currentPrice);
    if (priceVol.triggered) {
        ruleScore += priceVol.score;
        triggeredRules.push(`Oracle Alert: ${priceVol.label}`);
    }
    // Cap rule score at 100
    ruleScore = Math.min(ruleScore, 100);
    // ---- 3. AI Engine ----
    const aiResult = await (0, aiService_js_1.analyzeTransaction)({
        ...tx,
        walletAgeHours: tx.walletAgeHours,
        poolTvlChangePct: tx.poolTvlChangePct,
    });
    // ---- 4. Hybrid Score Calculation ----
    // Final Risk Score = (AI Score × 0.6) + (Rule Engine Score × 0.4)
    const finalRiskScore = Math.min(100, Math.round((aiResult.riskScore * 0.6) + (ruleScore * 0.4)));
    // Determine category from final score
    let finalCategory = 'Low Risk';
    if (finalRiskScore >= 85)
        finalCategory = 'Critical Risk';
    else if (finalRiskScore >= 60)
        finalCategory = 'High Risk';
    else if (finalRiskScore >= 35)
        finalCategory = 'Medium Risk';
    // Enrich AI explanation with rule engine context
    const ruleContext = triggeredRules.length > 0
        ? ` [Rule Engine Flags: ${triggeredRules.join(' | ')}. Rule Score: ${ruleScore}/100. Oracle SUI/USD: $${currentPrice.price.toFixed(4)} (Δ5m: ${currentPrice.change5m.toFixed(2)}%)]`
        : ` [All rules passed. Oracle SUI/USD: $${currentPrice.price.toFixed(4)}]`;
    const fullExplanation = aiResult.aiExplanation + ruleContext;
    // ---- 5. Persist Alert + Report to Database ----
    const alert = await db_js_1.prisma.alert.create({
        data: {
            txHash: tx.txHash,
            sender: tx.sender,
            receiver: tx.receiver,
            amount: tx.amount,
            token: tx.token,
            riskScore: finalRiskScore,
            category: finalCategory,
            protocol: tx.protocol,
            timestamp: new Date(tx.timestamp),
            report: {
                create: {
                    aiExplanation: fullExplanation,
                    confidence: aiResult.confidence,
                },
            },
        },
        include: { report: true },
    });
    console.log(`[RiskEngine] ${tx.txHash.substring(0, 10)}... | ` +
        `Score: ${finalRiskScore} (${finalCategory}) | ` +
        `AI: ${aiResult.riskScore} Rules: ${ruleScore} | ` +
        `SUI: $${currentPrice.price.toFixed(4)}`);
    // ---- 6. Autonomous On-Chain Action ----
    // If score is critical AND market isn't already paused → execute PTB pause
    if (finalRiskScore >= 90 && !(0, autonomousAction_js_1.isMarketPaused)()) {
        console.log(`[RiskEngine] 🚨 Score ${finalRiskScore} >= 90 — triggering autonomous market pause...`);
        // Fire-and-forget; WS broadcast handled via actionEvents in index.ts
        (0, autonomousAction_js_1.executeEmergencyPause)(finalRiskScore).catch(err => console.error('[RiskEngine] Autonomous pause failed:', err));
    }
    // ---- 7. Notifications ----
    const shouldNotify = settings.notificationType === 'all' ||
        (settings.notificationType === 'critical' && finalRiskScore >= 80);
    if (finalRiskScore >= settings.threshold && shouldNotify) {
        await (0, notifier_js_1.sendAlertNotification)({
            txHash: alert.txHash,
            protocol: alert.protocol,
            riskScore: alert.riskScore,
            category: alert.category,
            amount: alert.amount,
            token: alert.token,
            explanation: fullExplanation,
        });
    }
    return alert;
}
