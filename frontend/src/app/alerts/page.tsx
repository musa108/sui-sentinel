"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  ShieldAlert,
  Cpu,
  Eye,
  User,
  ChevronRight,
  Settings2,
  Calendar,
  AlertOctagon,
  ShieldOff,
  ShieldCheck,
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

interface MarketPauseState {
  isPaused: boolean;
  lastPauseDigest: string | null;
  lastPauseScore: number;
  simulated?: boolean;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [marketPause, setMarketPause] = useState<MarketPauseState>({
    isPaused: false,
    lastPauseDigest: null,
    lastPauseScore: 0,
  });
  const [resuming, setResuming] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  const handleDAOResume = useCallback(async () => {
    setResuming(true);
    try {
      const res = await fetch("https://sui-sentinel.onrender.com/api/market-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: overrideReason || "DAO manual override — risk conditions reassessed by governance",
        }),
      });
      if (res.ok) {
        setMarketPause({ isPaused: false, lastPauseDigest: null, lastPauseScore: 0 });
        setOverrideReason("");
      }
    } catch (err) {
      console.error("DAO resume failed:", err);
    } finally {
      setResuming(false);
    }
  }, [overrideReason]);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [alertsRes, statusRes] = await Promise.all([
          fetch("https://sui-sentinel.onrender.com/api/alerts"),
          fetch("https://sui-sentinel.onrender.com/api/market-status"),
        ]);
        if (alertsRes.ok) {
          const data = await alertsRes.json();
          setAlerts(data);
          if (data.length > 0) setSelectedAlert(data[0]);
        }
        if (statusRes.ok) {
          const ms = await statusRes.json();
          setMarketPause({
            isPaused: ms.isPaused,
            lastPauseDigest: ms.lastPauseDigest,
            lastPauseScore: ms.lastPauseScore,
            simulated: ms.simulated,
          });
        }
      } catch (err) {
        console.error("Failed to fetch alerts:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();

    const ws = new WebSocket("https://sui-sentinel.onrender.com");
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "NEW_ALERT") {
          setAlerts((prev) => [msg.data, ...prev.slice(0, 99)]);
        }
        if (msg.type === "MARKET_PAUSED") {
          setMarketPause({ isPaused: true, lastPauseDigest: msg.data.digest, lastPauseScore: msg.data.riskScore, simulated: msg.data.simulated });
        }
        if (msg.type === "MARKET_RESUMED") {
          setMarketPause({ isPaused: false, lastPauseDigest: null, lastPauseScore: 0 });
        }
        if (msg.type === "MARKET_STATUS") {
          setMarketPause({ isPaused: msg.data.isPaused, lastPauseDigest: msg.data.lastPauseDigest, lastPauseScore: msg.data.lastPauseScore });
        }
      } catch (err) {
        console.error("WS error:", err);
      }
    };
    return () => ws.close();
  }, []);

  // Compute derived state synchronously during render to avoid cascading useEffect render state loops
  const filteredAlerts = alerts.filter((alert) => {
    if (categoryFilter !== "All" && alert.category !== categoryFilter) {
      return false;
    }
    if (search.trim()) {
      const query = search.toLowerCase();
      return (
        alert.txHash.toLowerCase().includes(query) ||
        alert.protocol.toLowerCase().includes(query)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] space-y-4">
        <Cpu className="w-10 h-10 animate-spin text-cyan-400" />
        <p className="text-slate-400 font-mono text-sm tracking-wider uppercase">
          Fetching compliance audit logs...
        </p>
      </div>
    );
  }

  const getRiskColor = (score: number) => {
    if (score >= 85) return { text: "text-red-400", bg: "bg-red-500/5", border: "border-red-500/15", dot: "bg-red-550" };
    if (score >= 60) return { text: "text-orange-400", bg: "bg-orange-500/5", border: "border-orange-500/15", dot: "bg-orange-550" };
    if (score >= 35) return { text: "text-amber-400", bg: "bg-amber-500/5", border: "border-amber-500/15", dot: "bg-amber-550" };
    return { text: "text-emerald-400", bg: "bg-emerald-500/5", border: "border-emerald-500/15", dot: "bg-emerald-550" };
  };

  const categories = ["All", "Low Risk", "Medium Risk", "High Risk", "Critical Risk"];

  return (
    <div className="space-y-5 max-w-7xl mx-auto lg:h-[calc(100vh-140px)] flex flex-col">
      {/* Page Header */}
      <div className="shrink-0">
        <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
          Alerts Registry
        </h2>
        <p className="text-xs md:text-sm text-slate-400 mt-1.5 font-mono">
          Filter, examine, and govern flagged anomalies with AI audit reports and DAO controls.
        </p>
      </div>

      {/* ── DAO OVERRIDE PANEL (shown when market is paused) ── */}
      {marketPause.isPaused && (
        <div className="shrink-0 p-5 bg-red-500/[0.02] border border-red-500/30 rounded-2xl backdrop-blur-md pulse-red-border">
          <div className="flex items-center space-x-3 mb-4">
            <ShieldOff className="w-6 h-6 text-red-400 animate-pulse" />
            <div>
              <p className="text-red-300 font-bold font-mono text-xs md:text-sm uppercase tracking-widest">
                🚨 Market Paused by Autonomous AI Agent
              </p>
              <p className="text-red-400/70 text-xs font-mono mt-0.5">
                Trigger risk score: {marketPause.lastPauseScore}/100
                {marketPause.simulated ? " · SIMULATION MODE" : " · ON-CHAIN PTB EXECUTED"}
              </p>
              {marketPause.lastPauseDigest && (
                <p className="text-slate-500 text-[10px] font-mono mt-0.5 truncate max-w-xs md:max-w-lg">
                  Ref: {marketPause.lastPauseDigest}
                </p>
              )}
            </div>
          </div>

          {/* DAO Override Form */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center mt-2">
            <input
              type="text"
              placeholder="Enter DAO override justification (optional)..."
              className="flex-1 px-4 py-2.5 bg-slate-950/60 border border-slate-900 rounded-xl text-xs text-slate-350 placeholder-slate-600 font-mono focus:outline-none focus:border-red-500/40 transition"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
            />
            <button
              onClick={handleDAOResume}
              disabled={resuming}
              className="shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 bg-red-655 hover:bg-red-600 disabled:opacity-60 text-white font-bold font-mono text-xs rounded-xl uppercase tracking-wider transition-all"
            >
              <ShieldCheck className={`w-4 h-4 ${resuming ? "animate-spin" : ""}`} />
              {resuming ? "Executing Override..." : "DAO Override — Resume Protocol"}
            </button>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="shrink-0 flex flex-col lg:flex-row gap-4 items-center justify-between premium-card p-4">
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by Tx Hash or Protocol..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/50 border border-slate-900 rounded-xl text-xs md:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/40 font-mono transition"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2 w-full lg:w-auto mt-3 lg:mt-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-[10px] md:text-xs font-mono font-semibold transition ${
                categoryFilter === cat
                  ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-400"
                  : "bg-slate-950/40 border border-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Split Layout */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6 lg:pb-0">
        {/* Left: Alerts Table */}
        <div className="lg:col-span-7 flex flex-col h-[400px] lg:h-full premium-card overflow-hidden">
          <div className="overflow-auto flex-1">
            {filteredAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-550 p-8">
                <AlertOctagon className="w-8 h-8 text-slate-700 mb-2" />
                <p className="text-xs font-mono">NO ALERTS MATCHING FILTERS</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-950/40 text-slate-500 text-[9px] md:text-[10px] uppercase font-mono tracking-wider">
                    <th className="py-3 px-4">Score</th>
                    <th className="py-3 px-4">Protocol</th>
                    <th className="py-3 px-4">Hash</th>
                    <th className="py-3 px-4 text-right">Volume</th>
                    <th className="py-3 px-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/40 font-mono">
                  {filteredAlerts.map((alert) => {
                    const status = getRiskColor(alert.riskScore);
                    const isSelected = selectedAlert?.id === alert.id;
                    return (
                      <tr
                        key={alert.id}
                        onClick={() => setSelectedAlert(alert)}
                        className={`group cursor-pointer transition-all duration-150 ${
                          isSelected ? "bg-slate-900/40" : "hover:bg-slate-950/20"
                        }`}
                      >
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 border rounded-lg text-[9px] font-mono font-bold uppercase ${status.bg} ${status.text} ${status.border}`}>
                            <span className="w-1 h-1 rounded-full bg-current" />
                            <span>{alert.riskScore}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-bold text-xs">{alert.protocol}</td>
                        <td className="py-3 px-4 text-[10px] md:text-[11px] text-slate-500 group-hover:text-slate-400">
                          {alert.txHash.substring(0, 6)}...{alert.txHash.substring(alert.txHash.length - 4)}
                        </td>
                        <td className="py-3 px-4 text-right text-xs font-semibold text-slate-200">
                          {alert.amount.toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">{alert.token}</span>
                        </td>
                        <td className="py-3 px-2">
                          <ChevronRight className={`w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition ${isSelected ? "translate-x-1" : ""}`} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: Audit Detail Panel */}
        <div className="lg:col-span-5 h-auto lg:h-full flex flex-col">
          {selectedAlert ? (
            <div className="flex-1 premium-card p-5 overflow-y-auto space-y-5">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-900 pb-4">
                <div>
                  <span className="text-[9px] md:text-[10px] font-mono text-slate-500 uppercase tracking-widest">Protocol Anomaly Report</span>
                  <h3 className="text-base md:text-lg font-display font-bold text-slate-100 mt-1">{selectedAlert.protocol}</h3>
                </div>
                <div className="text-right">
                  <span className="text-[9px] md:text-[10px] font-mono text-slate-500 uppercase">Risk Score</span>
                  <div className="mt-1">
                    <span className={`inline-block font-mono font-bold text-base px-3 py-0.5 rounded-lg border ${getRiskColor(selectedAlert.riskScore).bg} ${getRiskColor(selectedAlert.riskScore).text} ${getRiskColor(selectedAlert.riskScore).border}`}>
                      {selectedAlert.riskScore}/100
                    </span>
                  </div>
                </div>
              </div>

              {/* Transaction Metadata */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono p-4 bg-slate-950/40 border border-slate-900 rounded-xl">
                <div className="col-span-2 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase">Transaction Hash</span>
                  <p className="text-slate-355 font-semibold truncate select-all text-[9px] md:text-[10px]">{selectedAlert.txHash}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase">Volume</span>
                  <p className="text-slate-300 font-semibold">{selectedAlert.amount.toLocaleString()} {selectedAlert.token}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase">Category</span>
                  <p className={`font-bold ${getRiskColor(selectedAlert.riskScore).text}`}>{selectedAlert.category}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase flex items-center gap-1"><User className="w-3 h-3 animate-pulse" /> Sender</span>
                  <p className="text-slate-400 truncate select-all text-[9px] md:text-[10px]">{selectedAlert.sender}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase flex items-center gap-1"><User className="w-3 h-3 animate-pulse" /> Receiver</span>
                  <p className="text-slate-400 truncate select-all text-[9px] md:text-[10px]">{selectedAlert.receiver}</p>
                </div>
                <div className="col-span-2 flex justify-between items-center border-t border-slate-900 pt-2.5 text-[9px] md:text-[10px] text-slate-500">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Detected</span>
                  <span className="text-slate-400 font-semibold">{new Date(selectedAlert.timestamp).toLocaleString()}</span>
                </div>
              </div>

              {/* AI Analysis Block */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-cyan-400 animate-pulse" />
                    AI Security Analysis
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">
                    CONFIDENCE: {Math.round((selectedAlert.report?.confidence ?? 0) * 100)}%
                  </span>
                </div>
                <div className={`p-4 rounded-xl border leading-relaxed font-sans text-xs text-slate-350 ${
                  selectedAlert.riskScore >= 80
                    ? "bg-red-500/[0.02] border-red-500/15"
                    : "bg-cyan-500/[0.015] border-cyan-500/15"
                }`}>
                  {selectedAlert.report?.aiExplanation ?? "Extracting audit data..."}
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-slate-900 pt-4 flex gap-3">
                <a
                  href={`https://suiscan.xyz/testnet/tx/${selectedAlert.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-900 text-xs font-mono font-medium rounded-xl text-slate-300 transition"
                >
                  <Eye className="w-4 h-4" /> Inspect
                </a>
                <button
                  onClick={() => alert("On-chain store_alert() PTB would be called here with SUI_PACKAGE_ID set.")}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-cyan-700 hover:bg-cyan-600 font-semibold text-xs font-mono rounded-xl text-white transition shadow-lg hover:shadow-cyan-500/15"
                >
                  <Settings2 className="w-4 h-4" /> Store On-Chain
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 premium-card border-dashed p-8 flex flex-col items-center justify-center text-slate-550 text-center min-h-[250px]">
              <ShieldAlert className="w-10 h-10 text-slate-700 mb-2" />
              <p className="text-xs font-mono uppercase">Select an alert to view intelligence report</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
