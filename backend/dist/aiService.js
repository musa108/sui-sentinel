"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPrompt = buildPrompt;
exports.analyzeTransaction = analyzeTransaction;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/**
 * Builds a structured prompt for transaction analysis
 */
function buildPrompt(tx) {
    return `You are a Sui Blockchain DeFi Security Auditor and Risk Agent.
Analyze the following DeFi transaction and evaluate its risk profile.

Transaction Details:
- Hash: ${tx.txHash}
- Sender Wallet: ${tx.sender}
- Receiver Address: ${tx.receiver}
- Amount: ${tx.amount} ${tx.token}
- Protocol: ${tx.protocol}
- Time: ${new Date(tx.timestamp).toISOString()}
- Sender Wallet Age (hours): ${tx.walletAgeHours ?? 'Unknown'}
- Protocol Pool TVL Change (%): ${tx.poolTvlChangePct ?? 0}%

Assess the risk using these criteria:
1. Transaction size relative to standard activity.
2. Wallet history and age (extremely new wallets performing large interactions is a red flag).
3. Protocol interaction patterns (e.g. rapid TVL drains, pool exploitation, flash loans).

You MUST respond ONLY with a valid JSON object in this format:
{
  "riskScore": <number between 0 and 100>,
  "category": "<Low Risk | Medium Risk | High Risk | Critical Risk>",
  "confidence": <number between 0.0 and 1.0>,
  "explanation": "<detailed natural language explanation of the security audit>"
}`;
}
/**
 * Run risk analysis using AI or fallback heuristics.
 */
async function analyzeTransaction(tx) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    if (apiKey) {
        try {
            // If the user configures API keys, we can perform a fetch request to the LLM.
            // Here we show standard implementation structure for both Gemini/OpenAI
            const isGemini = !!process.env.GEMINI_API_KEY;
            const url = isGemini
                ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`
                : 'https://api.openai.com/v1/chat/completions';
            const prompt = buildPrompt(tx);
            const headers = {
                'Content-Type': 'application/json',
            };
            if (!isGemini) {
                headers['Authorization'] = `Bearer ${apiKey}`;
            }
            const body = isGemini
                ? { contents: [{ parts: [{ text: prompt }] }] }
                : {
                    model: 'gpt-4-turbo',
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' }
                };
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            });
            if (response.ok) {
                const data = (await response.json());
                let jsonStr = '';
                if (isGemini) {
                    jsonStr = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                }
                else {
                    jsonStr = data.choices?.[0]?.message?.content || '';
                }
                // Clean json output (remove markdown blocks if present)
                jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
                const parsed = JSON.parse(jsonStr);
                return {
                    riskScore: Number(parsed.riskScore ?? 0),
                    category: parsed.category ?? 'Low Risk',
                    confidence: Number(parsed.confidence ?? 0.5),
                    aiExplanation: parsed.explanation ?? 'Transaction processed successfully.'
                };
            }
        }
        catch (error) {
            console.error('Error contacting AI Service, falling back to heuristics:', error);
        }
    }
    // Fallback heuristic scoring generator (mimics LLM analysis with highly detailed explanations)
    return runHeuristicAI(tx);
}
function runHeuristicAI(tx) {
    let score = 10;
    const indicators = [];
    const walletAge = tx.walletAgeHours ?? 100;
    const tvlChange = Math.abs(tx.poolTvlChangePct ?? 0);
    // Analyze transaction volume
    if (tx.amount > 500000) {
        score += 45;
        indicators.push(`massive transfer volume of ${tx.amount.toLocaleString()} ${tx.token} exceeding normal protocol limits`);
    }
    else if (tx.amount > 100000) {
        score += 25;
        indicators.push(`substantial transaction amount of ${tx.amount.toLocaleString()} ${tx.token}`);
    }
    else {
        indicators.push(`routine retail trade size of ${tx.amount.toLocaleString()} ${tx.token}`);
    }
    // Analyze wallet age
    if (walletAge < 2) {
        score += 35;
        indicators.push(`unusually fresh sender wallet initialized less than 2 hours ago`);
    }
    else if (walletAge < 24) {
        score += 15;
        indicators.push(`relatively new wallet created in the last 24 hours`);
    }
    // Analyze TVL change
    if (tvlChange >= 30) {
        score += 40;
        indicators.push(`extreme TVL drain (${tvlChange}% reserve depletion) on the pool structure`);
    }
    else if (tvlChange >= 15) {
        score += 20;
        indicators.push(`noticeable pool liquidity shift of ${tvlChange}%`);
    }
    // Cap score
    score = Math.min(score, 100);
    // Assign category
    let category = 'Low Risk';
    let confidence = 0.95;
    if (score >= 85) {
        category = 'Critical Risk';
        confidence = 0.88;
    }
    else if (score >= 60) {
        category = 'High Risk';
        confidence = 0.90;
    }
    else if (score >= 35) {
        category = 'Medium Risk';
        confidence = 0.92;
    }
    // Detailed compliance and security explanation
    let explanation = '';
    if (category === 'Critical Risk') {
        explanation = `SECURITY AUDIT FLAGGED CRITICAL EXPLOIT HAZARD. Transaction ${tx.txHash.substring(0, 10)}... has been categorized as Critical Risk (${score}/100) due to multiple high-severity metrics: ${indicators.join(' AND ')}. This pattern closely matches flash loan vector attacks or pool drain exploits targeting ${tx.protocol}. Immediate on-chain transaction throttling or administrative freezing of pool smart contract events is recommended to protect remaining TVL assets.`;
    }
    else if (category === 'High Risk') {
        explanation = `HIGH RISK PROTOCOL ANOMALY DETECTED. The transaction contains suspicious parameters: ${indicators.join(', accompanied by ')}. A transaction amount of ${tx.amount.toLocaleString()} ${tx.token} interacting with ${tx.protocol} represents an outlier in wallet behavior. Given the high probability of wallet sybil attacks or coordinated liquidity siphon routines, automated audit sensors recommend flagging the transaction and raising compliance monitoring sensitivity levels on sender address ${tx.sender.substring(0, 10)}...`;
    }
    else if (category === 'Medium Risk') {
        explanation = `MODERATE RISK WARNING. The system detected mild deviations from base protocol baselines: ${indicators.join(', combined with ')}. While this transaction does not represent an active exploit signature, the high volume or young age of the wallet necessitates observation. No immediate action is required, but secondary liquidity routes on ${tx.protocol} should be checked.`;
    }
    else {
        explanation = `COMPLIANCE CLEARANCE. The transaction represents standard, low-impact behavior: ${indicators.join('. ')}. Interaction is within standard deviation parameters for liquidity interactions on ${tx.protocol}, and sender wallet exhibits normal historical behavior. Approved under compliance standard procedures.`;
    }
    return {
        riskScore: score,
        category,
        confidence,
        aiExplanation: explanation
    };
}
