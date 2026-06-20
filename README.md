# Sui Sentinel — Autonomous DeFi Risk & Compliance Agent

Sui Sentinel is a comprehensive, AI-powered DeFi risk intelligence and on-chain compliance system designed for the Sui Blockchain. It acts as an autonomous guardian, monitoring on-chain activity, calculating risk metrics, and proactively responding to threats in real-time.

![Sui Sentinel Architecture](frontend/public/sui_sentinel_logo.png)

## 🌟 Core Components

The repository is structured as a monorepo consisting of three main components:

### 1. Backend (`/backend`)
A high-performance Node.js/TypeScript service that acts as the telemetry and autonomous action agent.
- **Real-Time Auditing**: Subscribes to blockchain events (or simulated event streams) to track incoming transactions and swaps.
- **Risk Calculation**: Uses an AI-powered evaluation engine to score transactions and categorize anomalies (Low, Medium, High, Critical).
- **Autonomous Directives**: Emits PTBs (Programmable Transaction Blocks) to automatically pause DeFi markets if a severe threat is detected.
- **WebSocket Streaming**: Broadcasts live telemetry and oracle price data to connected clients.

### 2. Frontend (`/frontend`)
A modern Next.js dashboard for security operators to visualize risk data and manage the protocol.
- **Live Telemetry**: Real-time display of audited transactions, metrics, and network health.
- **Governance Controls**: Allows DAO operators to manually override and resume markets that have been paused by the agent.
- **Analytics & Reporting**: In-depth distribution charts and historical timeline data using Recharts.
- **Dynamic Configuration**: Operators can modify trigger thresholds, notification levels, and rules straight from the dashboard.

### 3. Smart Contracts (`/contracts`)
Sui Move smart contracts containing the on-chain logic for the risk compliance modules.
- **State Management**: Keeps track of protocol states (e.g., normal operations vs. emergency paused state).
- **Compliance Rules**: Defines standard boundaries and rule sets used alongside the off-chain autonomous agent.

---

## 🚀 Getting Started

Follow the steps below to set up your local development environment.

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v18 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Sui CLI](https://docs.sui.io/guides/developer/getting-started/sui-install) (for contract deployment)

### 1. Setup Backend
1. Navigate into the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Initialize the Prisma database:
   ```bash
   npm run db:init
   ```
4. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The backend will run on `http://localhost:5000` by default and start streaming data via WebSocket.*

### 2. Setup Frontend
1. Open a new terminal and navigate into the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. *(Optional)* Provide Environment Variables:
   Create a `.env.local` file in the `frontend` directory:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000
   NEXT_PUBLIC_WS_URL=ws://localhost:5000
   ```
4. Start the frontend development server:
   ```bash
   npm run dev
   ```
   *The dashboard will be accessible at `http://localhost:3000`.*

### 3. Build & Test Smart Contracts
1. Navigate to the `contracts` directory:
   ```bash
   cd contracts
   ```
2. Build the Move packages:
   ```bash
   sui move build
   ```

---

## ⚙️ Configuration & Operation

- **Adjust Rules**: Access the `Rules & Settings` panel on the dashboard (`http://localhost:3000/settings`) to adjust Sybil detection hours, liquidity drain percentages, and transaction amount thresholds.
- **DAO Overrides**: If the AI Agent pauses a market, operators can provide a cryptographic signature and justification to unpause the market from the Overview or Alerts tab.
- **Database Management**: For manual database inspection of alerts and reports, use `npm run db:studio` inside the `backend` folder.

## 🛡️ License & Security
*(Add specific licensing and responsible disclosure guidelines here)*
