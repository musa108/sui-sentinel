"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/config";
import { 
  Sliders, 
  ToggleLeft, 
  Bell, 
  ShieldCheck, 
  Cpu, 
  Save 
} from "lucide-react";

interface Settings {
  threshold: number;
  notificationType: string;
  largeTxThreshold: number;
  liquidityDrainPct: number;
  newWalletAgeHours: number;
  enableLargeTxRule: boolean;
  enableDrainRule: boolean;
  enableWalletRule: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch(`${API_URL}/api/settings`);
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (err) {
        console.error("Failed to load systems settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setSuccess(false);
    try {
      const res = await fetch(`${API_URL}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to update settings:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] space-y-4">
        <Cpu className="w-10 h-10 animate-spin text-cyan-400" />
        <p className="text-slate-400 font-mono text-sm tracking-wider uppercase">Loading security node configuration...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] text-slate-500">
        <Sliders className="w-8 h-8 text-slate-700 mb-2" />
        <p className="text-xs font-mono">FAILED TO RETRIEVE CONFIGURATION PARAMS</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Title */}
      <div>
        <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">Rules & Settings</h2>
        <p className="text-xs md:text-sm text-slate-400 mt-1.5 font-mono">Configure autonomous auditing thresholds, filter definitions, and notification alerts.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 pb-12">
        {/* Risk Threshold Card */}
        <div className="premium-card p-6 space-y-5">
          <div className="flex items-center space-x-2.5 border-b border-slate-900 pb-3">
            <Sliders className="w-4.5 h-4.5 text-cyan-400" />
            <h4 className="font-bold text-xs md:text-sm uppercase tracking-wider font-display text-slate-200">Security Severity Thresholds</h4>
          </div>

          <div className="space-y-4 font-mono text-xs">
            <div className="flex justify-between items-center">
              <label className="text-slate-400 font-medium">Notification Trigger Threshold (Score)</label>
              <span className="font-bold text-cyan-400 bg-cyan-500/5 border border-cyan-500/15 px-2.5 py-0.5 rounded-lg">
                {settings.threshold} / 100
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500 focus:outline-none"
              value={settings.threshold}
              onChange={(e) => setSettings({ ...settings, threshold: Number(e.target.value) })}
            />
            <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
              Transactions receiving a combined risk score greater than or equal to this threshold will trigger on-chain storage events and external alerts.
            </p>
          </div>
        </div>

        {/* Notifications Config Card */}
        <div className="premium-card p-6 space-y-5">
          <div className="flex items-center space-x-2.5 border-b border-slate-900 pb-3">
            <Bell className="w-4.5 h-4.5 text-cyan-400" />
            <h4 className="font-bold text-xs md:text-sm uppercase tracking-wider font-display text-slate-200">Alert Notifications Dispatch</h4>
          </div>

          <div className="space-y-4 font-mono text-xs">
            <div className="space-y-2">
              <label className="text-slate-400 font-medium block">Active Dispatch Preference</label>
              <select
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-900 rounded-xl text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 focus:border-cyan-500/40 font-mono transition"
                value={settings.notificationType}
                onChange={(e) => setSettings({ ...settings, notificationType: e.target.value })}
              >
                <option value="all">Dispatch All Alerts (All risk bands)</option>
                <option value="critical">Dispatch Critical Anomaly Alerts Only (Score &gt;= 80)</option>
                <option value="none">Mute Channels (No external alerts)</option>
              </select>
            </div>
            <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
              Configures target channels (Telegram bots, Discord channels, and operator emails) to dispatch telemetry analysis logs automatically.
            </p>
          </div>
        </div>

        {/* Rules Engine Config Card */}
        <div className="premium-card p-6 space-y-6">
          <div className="flex items-center space-x-2.5 border-b border-slate-900 pb-3">
            <ToggleLeft className="w-4.5 h-4.5 text-cyan-400" />
            <h4 className="font-bold text-xs md:text-sm uppercase tracking-wider font-display text-slate-200">Active Rule Engine Directives</h4>
          </div>

          <div className="space-y-4 font-mono text-xs">
            {/* Rule 1 */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-950/40 border border-slate-900 rounded-xl">
              <div className="space-y-1 md:max-w-md">
                <span className="font-bold text-slate-300">Large Transaction Warning Rule</span>
                <p className="text-[10px] text-slate-500 font-sans leading-relaxed">Flags trades or swaps that exceed standard liquidity pool depth margins.</p>
              </div>
              <div className="flex items-center space-x-4 mt-2 md:mt-0 justify-between md:justify-end w-full md:w-auto">
                <input
                  type="number"
                  className="w-28 px-3 py-1.5 bg-slate-950 border border-slate-900 rounded-lg text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500/30 focus:border-cyan-500/40 text-right font-mono transition"
                  value={settings.largeTxThreshold}
                  onChange={(e) => setSettings({ ...settings, largeTxThreshold: Number(e.target.value) })}
                />
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, enableLargeTxRule: !settings.enableLargeTxRule })}
                  className={`px-3 py-1.5 rounded-xl font-bold uppercase transition text-[10px] tracking-wider shrink-0 cursor-pointer ml-4 ${
                    settings.enableLargeTxRule 
                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 font-bold" 
                      : "bg-slate-950 text-slate-550 border border-slate-900"
                  }`}
                >
                  {settings.enableLargeTxRule ? "ACTIVE" : "MUTED"}
                </button>
              </div>
            </div>

            {/* Rule 2 */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-950/40 border border-slate-900 rounded-xl">
              <div className="space-y-1 md:max-w-md">
                <span className="font-bold text-slate-300">Pool Liquidity Drain Warning Rule</span>
                <p className="text-[10px] text-slate-500 font-sans leading-relaxed">Flags rapid reserve reductions indicating potential rug-pull signature sequences.</p>
              </div>
              <div className="flex items-center space-x-4 mt-2 md:mt-0 justify-between md:justify-end w-full md:w-auto">
                <div className="relative">
                  <input
                    type="number"
                    className="w-20 pr-6 pl-3 py-1.5 bg-slate-950 border border-slate-900 rounded-lg text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500/30 focus:border-cyan-500/40 text-right font-mono transition"
                    value={settings.liquidityDrainPct}
                    onChange={(e) => setSettings({ ...settings, liquidityDrainPct: Number(e.target.value) })}
                  />
                  <span className="absolute right-2.5 top-1.5 text-slate-500 font-mono">%</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, enableDrainRule: !settings.enableDrainRule })}
                  className={`px-3 py-1.5 rounded-xl font-bold uppercase transition text-[10px] tracking-wider shrink-0 cursor-pointer ml-4 ${
                    settings.enableDrainRule 
                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 font-bold" 
                      : "bg-slate-950 text-slate-550 border border-slate-900"
                  }`}
                >
                  {settings.enableDrainRule ? "ACTIVE" : "MUTED"}
                </button>
              </div>
            </div>

            {/* Rule 3 */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-950/40 border border-slate-900 rounded-xl">
              <div className="space-y-1 md:max-w-md">
                <span className="font-bold text-slate-300">Sybil / Newly Created Wallet Rule</span>
                <p className="text-[10px] text-slate-500 font-sans leading-relaxed">Increases monitoring sensitivity on transactions initiated by newly created addresses.</p>
              </div>
              <div className="flex items-center space-x-4 mt-2 md:mt-0 justify-between md:justify-end w-full md:w-auto">
                <div className="relative">
                  <input
                    type="number"
                    className="w-20 pr-6 pl-3 py-1.5 bg-slate-950 border border-slate-900 rounded-lg text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500/30 focus:border-cyan-500/40 text-right font-mono transition"
                    value={settings.newWalletAgeHours}
                    onChange={(e) => setSettings({ ...settings, newWalletAgeHours: Number(e.target.value) })}
                  />
                  <span className="absolute right-2.5 top-1.5 text-slate-500 font-mono">h</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, enableWalletRule: !settings.enableWalletRule })}
                  className={`px-3 py-1.5 rounded-xl font-bold uppercase transition text-[10px] tracking-wider shrink-0 cursor-pointer ml-4 ${
                    settings.enableWalletRule 
                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 font-bold" 
                      : "bg-slate-950 text-slate-550 border border-slate-900"
                  }`}
                >
                  {settings.enableWalletRule ? "ACTIVE" : "MUTED"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-4">
          <div>
            {success && (
              <div className="flex items-center space-x-2 text-emerald-400 text-xs font-mono">
                <ShieldCheck className="w-4 h-4 animate-bounce" />
                <span>THROWS AND DIRECTIVES UPDATED SUCCESSFULLY</span>
              </div>
            )}
          </div>
          
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-cyan-700 hover:bg-cyan-600 font-bold text-xs font-mono rounded-xl text-white transition hover:shadow-lg hover:shadow-cyan-500/15 disabled:opacity-50 cursor-pointer shadow-lg"
          >
            <Save className="w-4 h-4" /> {saving ? "SAVING telemetry config..." : "COMMIT DIRECTIVES"}
          </button>
        </div>
      </form>
    </div>
  );
}
