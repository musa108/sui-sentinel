# Sui Sentinel — DeFi Risk Intelligence Dashboard

Sui Sentinel is a premium, autonomous, AI-powered DeFi risk intelligence and on-chain compliance agent for the Sui Blockchain. This Next.js web application serves as the telemetry control panel and governance dashboard for security operators.

![Sui Sentinel Logo](/sui_sentinel_logo.png)

## 🛡️ Core Capabilities

- **Real-Time Telemetry Audit Logs**: Dynamic auditing of on-chain activity via automated WebSocket feeds, calculating multi-variable security risk scores instantly.
- **AI-Powered Threat Profiling**: Deep analysis reports for flagged transactions, explaining vector signatures and estimating detection confidence.
- **Autonomous Compliance Directives**: Triggers protocol-level actions (e.g., executing emergency pauses via Programmable Transaction Blocks) when risk boundaries are breached.
- **DAO Governance Controls**: Provides authorized operators with manual override capabilities to resume paused markets directly from the interface.
- **Advanced Rules Engine**: Customizable rule triggers targeting large swaps, rapid liquidity drains, and Sybil/new wallet behaviors.

## 💻 Tech Stack

- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (Glassmorphic cards, glowing vector highlights, custom scrollbars)
- **Charts**: Recharts (Responsive canvases, custom SVG gradients, visual color-coding)
- **Icons**: Lucide React
- **Typography**: Google Fonts (Plus Jakarta Sans, Space Grotesk, JetBrains Mono) loaded via `next/font`

## 🚀 Getting Started

### Prerequisites

Ensure you have Node.js 18+ and npm/yarn installed.

### Installation

Clone the repository and install dependencies:

```bash
cd frontend
npm install
```

### Run Local Development Server

Launch the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser to explore the dashboard.

### Build and Deploy

Create an optimized production bundle:

```bash
npm run build
npm start
```

## ⚙️ Configuration Rules

Sui Sentinel lets security operators fine-tune detection metrics in the **Rules & Settings** page:
1. **Trigger Threshold**: Minimum risk score (0-100) before storing alarms on-chain.
2. **Large Transaction Warning**: Flags trades exceeding standard liquidity pool depth margins.
3. **Liquidity Drain Warnings**: Flags rapid reserve reductions indicating potential rug-pull sequences.
4. **Sybil Wallet Rules**: Elevates monitoring sensitivity for newly created accounts.
