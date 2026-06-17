import { processTransaction } from './riskEngine.js';
import { TransactionData } from './aiService.js';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

type AlertCallback = (alert: any) => void;

class BlockchainListener {
  private callbacks: AlertCallback[] = [];
  private isRunning: boolean = false;
  private suiClient: SuiClient | null = null;

  constructor() {
    const rpcUrl = process.env.SUI_RPC_URL || getFullnodeUrl('testnet');
    try {
      this.suiClient = new SuiClient({ url: rpcUrl });
      console.log(`[Listener] Connected to Sui network at: ${rpcUrl}`);
    } catch (err) {
      console.error('[Listener] Failed to connect to Sui RPC. Running in simulator fallback mode:', err);
    }
  }

  /**
   * Register listener callback for when new alerts are processed.
   */
  public onAlert(cb: AlertCallback) {
    this.callbacks.push(cb);
  }

  private triggerAlert(alert: any) {
    this.callbacks.forEach(cb => cb(alert));
  }

  /**
   * Launch transaction listener and DeFi event simulator.
   */
  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[Listener] Blockchain Event Monitor & DeFi Simulation online.');

    // Execute simulator loop
    this.runSimulationLoop();
  }

  private async runSimulationLoop() {
    const protocols = ['Cetus Swap', 'Navi Protocol', 'Scallop Lending', 'Bucket Protocol', 'Suilend', 'Bluefin'];
    const tokens = ['SUI', 'USDC', 'USDT', 'vSUI', 'BUCK', 'afSUI'];

    const makeHash = () => {
      const characters = '0123456789abcdef';
      let result = '0x';
      for (let i = 0; i < 64; i++) {
        result += characters[Math.floor(Math.random() * 16)];
      }
      return result;
    };

    const makeAddress = () => {
      const characters = '0123456789abcdef';
      let result = '0x';
      for (let i = 0; i < 40; i++) {
        result += characters[Math.floor(Math.random() * 16)];
      }
      return result;
    };

    while (this.isRunning) {
      try {
        // Sleep for a random interval between 4 and 8 seconds to resemble realistic block times
        await new Promise(r => setTimeout(r, 4000 + Math.random() * 4000));

        const dice = Math.random();
        let amount = Math.floor(50 + Math.random() * 8000); // Standard volume
        let walletAgeHours = Math.floor(48 + Math.random() * 2000); // Standard established wallet
        let poolTvlChangePct = Math.floor(Math.random() * 3); // Normal TVL noise
        const protocol = protocols[Math.floor(Math.random() * protocols.length)];
        const token = tokens[Math.floor(Math.random() * tokens.length)];

        // Simulation branch triggers:
        // 4% chance: Critical Exploits (multiple flags triggered simultaneously)
        // 8% chance: High Volume (violating large transaction threshold)
        // 10% chance: Fresh Wallet (violating age constraint)
        // 8% chance: Heavy Pool Drain (violating TVL drop percentage)

        if (dice < 0.04) {
          // Critical attack mock
          amount = Math.floor(750000 + Math.random() * 400000);
          walletAgeHours = 1; // 1 hour old
          poolTvlChangePct = -35; // 35% pool TVL reduction
        } else if (dice < 0.12) {
          // Large Transaction
          amount = Math.floor(180000 + Math.random() * 150000);
        } else if (dice < 0.22) {
          // New Wallet activity
          walletAgeHours = Math.floor(Math.random() * 10); // created recently
          amount = Math.floor(12000 + Math.random() * 40000);
        } else if (dice < 0.30) {
          // Liquidity Drain
          poolTvlChangePct = -Math.floor(22 + Math.random() * 12);
          amount = Math.floor(65000 + Math.random() * 60000);
        }

        const rawTx: TransactionData = {
          txHash: makeHash(),
          sender: makeAddress(),
          receiver: makeAddress(),
          amount,
          token,
          timestamp: Date.now(),
          protocol,
          walletAgeHours,
          poolTvlChangePct
        };

        const alert = await processTransaction(rawTx);
        this.triggerAlert(alert);

      } catch (err) {
        console.error('[Listener] Error in DeFi simulation loop:', err);
      }
    }
  }

  public stop() {
    this.isRunning = false;
    console.log('[Listener] Blockchain Event Monitor & DeFi Simulation offline.');
  }
}

export const blockchainListener = new BlockchainListener();
