"use client";

import { useEffect, useState } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area 
} from "recharts";
import { Cpu, ShieldAlert, TrendingUp, BarChart4, PieChart as PieIcon } from "lucide-react";

interface AnalyticsData {
  categoryDistribution: { name: string; value: number }[];
  timeSeriesData: { time: string; score: number; amount: number; protocol: string }[];
  protocolStats: { name: string; alertsCount: number; volume: number }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch("https://sui-sentinel.onrender.com/api/stats");
        if (res.ok) {
          const stats = await res.json();
          setData(stats);
        }
      } catch (err) {
        console.error("Failed to load analytics metrics:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] space-y-4">
        <Cpu className="w-10 h-10 animate-spin text-cyan-400" />
        <p className="text-slate-400 font-mono text-sm tracking-wider uppercase">Compiling analytics matrix data...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] text-slate-500">
        <ShieldAlert className="w-8 h-8 text-slate-755 mb-2" />
        <p className="text-xs font-mono">FAILED TO LOAD TELEMETRY ANALYSIS MATRIX</p>
      </div>
    );
  }

  // Low: emerald, Medium: amber, High: orange, Critical: red
  const COLORS = ["#10b981", "#f59e0b", "#f97316", "#ef4444"];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">Telemetry Analytics</h2>
        <p className="text-sm text-slate-400 mt-2 font-mono">Aggregated metrics, risk vector distributions, and volume trends on the Sui network.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Timeline Area Chart */}
        <div className="p-6 bg-[#0b1121]/50 border border-slate-800 rounded-xl backdrop-blur-md space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <TrendingUp className="w-4.5 h-4.5 text-cyan-400" />
            <h4 className="font-bold text-sm uppercase tracking-wider font-mono text-slate-200">Risk Scores & Anomalies Timeline</h4>
          </div>
          <div className="h-80 w-full text-xs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.timeSeriesData}>
                <defs>
                  <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#00f2fe" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.25} />
                <XAxis dataKey="time" stroke="#64748b" />
                <YAxis stroke="#64748b" domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#070b19", borderColor: "#1e293b", borderRadius: "8px", color: "#e2e8f0" }}
                  itemStyle={{ color: "#00f2fe" }}
                />
                <Area type="monotone" dataKey="score" stroke="#00f2fe" strokeWidth={2} fillOpacity={1} fill="url(#scoreColor)" name="Risk Score" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Distribution Pie Chart */}
        <div className="p-6 bg-[#0b1121]/50 border border-slate-800 rounded-xl backdrop-blur-md space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <PieIcon className="w-4.5 h-4.5 text-cyan-400" />
            <h4 className="font-bold text-sm uppercase tracking-wider font-mono text-slate-200">Threat Severity Distribution</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            {/* Pie Chart */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.categoryDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {data.categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#070b19", borderColor: "#1e293b", borderRadius: "8px", color: "#e2e8f0" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legends */}
            <div className="space-y-3 font-mono text-xs">
              {data.categoryDistribution.map((entry, index) => (
                <div key={entry.name} className="flex justify-between items-center p-2.5 bg-slate-950/40 border border-slate-800/60 rounded">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                    <span className="text-slate-400">{entry.name}</span>
                  </div>
                  <span className="font-bold text-slate-200">{entry.value} alerts</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Protocol Alert Count Bar Chart */}
        <div className="p-6 bg-[#0b1121]/50 border border-slate-800 rounded-xl backdrop-blur-md lg:col-span-2 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <BarChart4 className="w-4.5 h-4.5 text-cyan-400" />
            <h4 className="font-bold text-sm uppercase tracking-wider font-mono text-slate-200">Threat Alert Vectors Per Protocol</h4>
          </div>
          <div className="h-80 w-full text-xs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.protocolStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.25} />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#070b19", borderColor: "#1e293b", borderRadius: "8px", color: "#e2e8f0" }}
                  itemStyle={{ color: "#f857a6" }}
                />
                <Bar dataKey="alertsCount" fill="#f857a6" radius={[4, 4, 0, 0]} name="Alert Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
