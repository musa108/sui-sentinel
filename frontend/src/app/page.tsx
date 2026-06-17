"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  Flame,
  Activity,
  Cpu,
  TrendingDown,
  TrendingUp,
  Zap,
  ShieldOff,
} from "lucide-react";

interface Alert {
  id: string;
  txHash: string;
  sender: string;
  receiver: string;
  amount: number;
  token: string;
  riskScore: number;
  category: string;
  protocol: string;
  timestamp: string;
  report?: { aiExplanation: string; confidence: number };
}

interface Stats {
  totalTransactions: number;
  activeAlerts: number;
  avgRiskScore: number;
  protocolHealth: string;
}

interface LivePrice {
  price: number;
  change1m: number;
  change5m: number;
  timestamp: number;
}

interface MarketPauseState {
  isPaused: boolean;
  lastPauseDigest: string | null;
  lastPauseScore: number;
  simulated?: boolean;
}

export default function OverviewPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalTransactions: 0,
    activeAlerts: 0,
    avgRiskScore: 0,
    protocolHealth: "Optimal",
  });
  const [livePrice, setLivePrice] = useState<LivePrice | null>(null);
  const [marketPause, setMarketPause] = useState<MarketPauseState>({
    isPaused: false,
    lastPauseDigest: null,
    lastPauseScore: 0,
  });
  const [loading, setLoading] = useState(true);
  const [resuming, setResuming] = useState(false);

  // DAO Override handler
  const handleDAOResume = useCallback(async () => {
    setResuming(true);
    try {
      const res = await fetch("http://localhost:5000/api/market-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "DAO operator manual override — risk conditions reassessed" }),
      });
      if (res.ok) {
        setMarketPause({ isPaused: false, lastPauseDigest: null, lastPauseScore: 0 });
      }
    } catch (err) {
      console.error("DAO resume failed:", err);
    } finally {
      setResuming(false);
    }
  }, []);

  useEffect(() => {
    // Initial data fetch
    async function fetchData() {
      try {
        const [alertsRes, statsRes, priceRes, statusRes] = await Promise.all([
          fetch("http://localhost:5000/api/alerts"),
          fetch("http://localhost:5000/api/stats"),
          fetch("http://localhost:5000/api/price"),
          fetch("http://localhost:5000/api/market-status"),
        ]);
        if (alertsRes.ok) setAlerts(await alertsRes.json());
        if (statsRes.ok) {
          const s = await statsRes.json();
          setStats({
            totalTransactions: s.totalTransactions,
            activeAlerts: s.activeAlerts,
            avgRiskScore: s.avgRiskScore,
            protocolHealth: s.protocolHealth,
          });
        }
        if (priceRes.ok) setLivePrice(await priceRes.json());
        if (statusRes.ok) {
          const ms = await statusRes.json();
          setMarketPause({
            isPaused: ms.isPaused,
            lastPauseDigest: ms.lastPauseDigest,
            lastPauseScore: ms.lastPauseScore,
          });
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();

    // WebSocket stream
    const ws = new WebSocket("ws://localhost:5000");
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "NEW_ALERT") {
          setAlerts((prev) => [msg.data, ...prev.slice(0, 49)]);
          setStats((prev) => ({
            ...prev,
            totalTransactions: prev.totalTransactions + 1,
            activeAlerts: msg.data.riskScore >= 60 ? prev.activeAlerts + 1 : prev.activeAlerts,
          }));
        }

        if (msg.type === "PRICE_UPDATE") {
          setLivePrice(msg.data);
        }

        if (msg.type === "MARKET_PAUSED") {
          setMarketPause({
            isPaused: true,
            lastPauseDigest: msg.data.digest,
            lastPauseScore: msg.data.riskScore,
            simulated: msg.data.simulated,
          });
        }

        if (msg.type === "MARKET_RESUMED") {
          setMarketPause({ isPaused: false, lastPauseDigest: null, lastPauseScore: 0 });
        }

        if (msg.type === "MARKET_STATUS") {
          setMarketPause({
            isPaused: msg.data.isPaused,
            lastPauseDigest: msg.data.lastPauseDigest,
            lastPauseScore: msg.data.lastPauseScore,
          });
        }
      } catch (err) {
        console.error("WS message error:", err);
      }
    };
    return () => ws.close();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] space-y-4">
        <Cpu className="w-10 h-10 animate-spin text-cyan-400" />
        <p className="text-slate-400 font-mono text-sm tracking-wider uppercase">
          Initialising security node telemetry...
        </p>
      </div>
    );
  }

  const getRiskStyle = (score: number) => {
    if (score >= 85)
      return { text: "text-red-400", border: "border-red-500/30", bg: "bg-red-500/10", label: "Critical" };
    if (score >= 60)
      return { text: "text-orange-400", border: "border-orange-500/30", bg: "bg-orange-500/10", label: "High" };
    if (score >= 35)
      return { text: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/10", label: "Medium" };
    return { text: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/10", label: "Low" };
  };

  const getHealthStyle = (health: string) => {
    if (health === "Critical") return "text-red-400 bg-red-500/10 border-red-500/30";
    if (health === "Warning") return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
  };

  const priceUp = (livePrice?.change5m ?? 0) >= 0;
  const priceChange5m = livePrice?.change5m ?? 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Title */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
          Overview Dashboard
        </h2>
        <p className="text-sm text-slate-400 mt-1 font-mono">
          Live oracle feeds · AI risk scoring · Autonomous on-chain compliance enforcement
        </p>
      </div>

      {/* ══ MARKET PAUSE BANNER ══ */}
      {marketPause.isPaused && (
        <div className="relative p-5 bg-red-950/30 border border-red-500/60 rounded-xl backdrop-blur-md pulse-red-border overflow-hidden">
          {/* Animated background grid accent */}
          <div className="absolute inset-0 opacity-5 cyber-grid pointer-events-none" />
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start space-x-4">
              <ShieldOff className="w-8 h-8 text-red-400 animate-pulse shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 font-bold font-mono uppercase tracking-widest text-sm">
                  🚨 AUTONOMOUS MARKET PAUSE ACTIVE
                </p>
                <p className="text-red-400/80 text-xs font-mono mt-1">
                  AI agent triggered emergency pause (Risk Score: {marketPause.lastPauseScore}/100)
                  {marketPause.simulated ? " · SIMULATION MODE" : ""}
                </p>
                {marketPause.lastPauseDigest && (
                  <p className="text-slate-500 text-[10px] font-mono mt-1 truncate max-w-xs">
                    On-chain ref: {marketPause.lastPauseDigest}
                  </p>
                )}
              </div>
            </div>
            {/* DAO Override Button */}
            <button
              onClick={handleDAOResume}
              disabled={resuming}
              className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-bold font-mono text-xs rounded-lg uppercase tracking-wider transition-all shadow-lg hover:shadow-red-500/30"
            >
              <ShieldCheck className={`w-4 h-4 ${resuming ? "animate-spin" : ""}`} />
              {resuming ? "Processing Override..." : "DAO Override — Resume Market"}
            </button>
          </div>
        </div>
      )}

      {/* ══ STATS GRID ══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        {/* Monitored Txs */}
        <div className="p-5 bg-[#0b1121]/60 border border-slate-800 rounded-xl backdrop-blur-md card-glow flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Txs Monitored</span>
            <h3 className="text-2xl font-bold font-mono mt-1.5 text-slate-100">
              {stats.totalTransactions.toLocaleString()}
            </h3>
          </div>
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-lg">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        {/* Active Threats */}
        <div className="p-5 bg-[#0b1121]/60 border border-slate-800 rounded-xl backdrop-blur-md card-glow flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Threat Alerts</span>
            <h3 className="text-2xl font-bold font-mono mt-1.5 text-slate-100">
              {stats.activeAlerts.toLocaleString()}
            </h3>
          </div>
          <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        {/* Avg Risk Score */}
        <div className="p-5 bg-[#0b1121]/60 border border-slate-800 rounded-xl backdrop-blur-md card-glow flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Avg Risk Score</span>
            <h3 className="text-2xl font-bold font-mono mt-1.5 text-slate-100">
              {stats.avgRiskScore}/100
            </h3>
          </div>
          <div className="p-2.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-lg">
            <Flame className="w-5 h-5" />
          </div>
        </div>

        {/* Network Safety */}
        <div className="p-5 bg-[#0b1121]/60 border border-slate-800 rounded-xl backdrop-blur-md card-glow flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Network Safety</span>
            <div className={`mt-2 text-[10px] font-mono font-bold px-2.5 py-1 border rounded-full text-center inline-block ${getHealthStyle(stats.protocolHealth)}`}>
              {stats.protocolHealth.toUpperCase()}
            </div>
          </div>
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* ── LIVE PRICE CARD (NEW) ── */}
        <div className={`p-5 border rounded-xl backdrop-blur-md card-glow flex items-center justify-between ${
          !priceUp && Math.abs(priceChange5m) >= 5
            ? "bg-red-950/20 border-red-500/30"
            : "bg-[#0b1121]/60 border-slate-800"
        }`}>
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-400" /> SUI / USD · Pyth Oracle
            </span>
            <h3 className="text-2xl font-bold font-mono mt-1.5 text-slate-100">
              ${livePrice ? livePrice.price.toFixed(4) : "—"}
            </h3>
            {livePrice && (
              <div className={`flex items-center space-x-1 mt-1 text-[10px] font-mono font-semibold ${
                priceUp ? "text-emerald-400" : "text-red-400"
              }`}>
                {priceUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{priceChange5m >= 0 ? "+" : ""}{priceChange5m.toFixed(2)}% (5m)</span>
              </div>
            )}
          </div>
          <div className={`p-2.5 border rounded-lg ${
            priceUp ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}>
            {priceUp ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5 animate-pulse" />}
          </div>
        </div>
      </div>

      {/* ══ MAIN CONTENT PANELS ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transaction Telemetry Stream */}
        <div className="lg:col-span-2 p-6 bg-[#0b1121]/50 border border-slate-800/80 rounded-xl backdrop-blur-md flex flex-col h-[500px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
              </span>
              <h4 className="font-bold text-sm uppercase tracking-wider font-mono">Live Auditing Telemetry</h4>
            </div>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
              AUTO-REFRESH
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {alerts.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500">
                <p className="text-xs font-mono">AWAITING DEFI EVENT STREAM...</p>
              </div>
            ) : (
              alerts.map((alert) => {
                const style = getRiskStyle(alert.riskScore);
                return (
                  <div
                    key={alert.id}
                    className={`p-3.5 bg-slate-950/40 border ${style.border} rounded-lg flex items-center justify-between hover:bg-slate-950/80 transition-all duration-200`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-11 h-11 rounded-lg ${style.bg} border ${style.border} flex flex-col items-center justify-center font-mono shrink-0`}>
                        <span className={`text-xs font-bold ${style.text}`}>{alert.riskScore}</span>
                        <span className="text-[7px] text-slate-500 uppercase">SCORE</span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold font-mono text-slate-300">{alert.protocol}</span>
                          <span className="text-[10px] font-mono text-slate-600">{alert.txHash.substring(0, 10)}...</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                          {alert.sender.substring(0, 8)}... → {alert.receiver.substring(0, 8)}...
                        </p>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-xs font-mono font-semibold text-slate-200">
                        {alert.amount.toLocaleString()} <span className="text-[10px] text-slate-500">{alert.token}</span>
                      </p>
                      <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${style.bg} ${style.text}`}>
                        {style.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Critical Warnings Stack */}
        <div className="p-6 bg-[#0b1121]/50 border border-slate-800/80 rounded-xl backdrop-blur-md flex flex-col h-[500px]">
          <div className="border-b border-slate-800 pb-3 mb-4">
            <h4 className="font-bold text-sm uppercase tracking-wider font-mono text-red-400">Critical Warning Stack</h4>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {alerts.filter((a) => a.riskScore >= 75).length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500">
                <p className="text-[10px] font-mono text-center">NO CRITICAL EVENTS</p>
              </div>
            ) : (
              alerts
                .filter((a) => a.riskScore >= 75)
                .slice(0, 6)
                .map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3.5 bg-red-950/15 border border-red-500/25 rounded-lg space-y-2 pulse-red-border"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-red-400 font-mono">{alert.protocol}</span>
                      <span className="text-[9px] font-mono font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                        {alert.riskScore}/100
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono truncate">
                      {alert.txHash.substring(0, 20)}...
                    </p>
                    <p className="text-[10px] text-slate-300 line-clamp-3 leading-relaxed border-t border-red-500/10 pt-1.5">
                      {alert.report?.aiExplanation?.substring(0, 160) ?? "Evaluating threat..."}...
                    </p>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
