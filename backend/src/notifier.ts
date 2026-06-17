export interface NotificationPayload {
  txHash: string;
  protocol: string;
  riskScore: number;
  category: string;
  amount: number;
  token: string;
  explanation: string;
}

/**
 * Dispatch warnings to multiple communication channels based on risk profiles.
 */
export async function sendAlertNotification(payload: NotificationPayload) {
  const { txHash, protocol, riskScore, category, amount, token } = payload;
  const formattedHash = `${txHash.substring(0, 10)}...${txHash.substring(txHash.length - 4)}`;

  console.log(`\n============== [DISPATCHING ALERTS - RISK SCORE: ${riskScore}] ==============`);

  // Telegram Mock
  const telegramMessage = `
📣 *CRITICAL COMPLIANCE ALERT*
*Protocol*: ${protocol}
*Risk Score*: ${riskScore}/100
*Category*: ${category}
*Amount*: ${amount.toLocaleString()} ${token}
*Transaction Hash*: \`${txHash}\`

*AI Analysis Detail*:
${payload.explanation}

🔗 View Dashboard: https://app.sui-risk-agent.xyz/alerts/${txHash}
`;
  console.log(`[TELEGRAM WEBHOOK MOCK SENDING]:\n${telegramMessage}`);

  // Discord Mock
  const discordMessage = {
    embeds: [{
      title: `🚨 CRITICAL RISK EVENT DETECTED: ${category}`,
      color: riskScore >= 85 ? 0xFF0000 : 0xFFAA00, // Red for critical, orange for high
      fields: [
        { name: 'Protocol', value: protocol, inline: true },
        { name: 'Risk Score', value: `${riskScore}/100`, inline: true },
        { name: 'Volume', value: `${amount.toLocaleString()} ${token}`, inline: true },
        { name: 'Transaction Hash', value: formattedHash, inline: false }
      ],
      description: payload.explanation,
      timestamp: new Date().toISOString()
    }]
  };
  console.log(`[DISCORD WEBHOOK MOCK SENDING]:\n`, JSON.stringify(discordMessage, null, 2));

  // Email Mock
  const emailTemplate = `
Subject: [Sui Compliance Agent] ACTION REQUIRED: ${category} Detected on ${protocol}

Dear Operator,

A transaction flagged with a risk score of ${riskScore}/100 has bypassed standard filters.

Transaction Info:
- Protocol: ${protocol}
- Risk Level: ${category}
- Asset Volume: ${amount} ${token}
- Transaction Hash: ${txHash}

AI Security Summary:
${payload.explanation}

Please log into the Compliance Center immediately to review this threat.

Best regards,
Sui Autonomous Compliance Security Agent
`;
  console.log(`[EMAIL SMTP MOCK SENDING]:\n${emailTemplate}`);
  console.log(`=========================================================================\n`);
}
