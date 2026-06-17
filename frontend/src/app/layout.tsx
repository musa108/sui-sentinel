"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  ShieldAlert, 
  LayoutDashboard, 
  AlertOctagon, 
  BarChart3, 
  Sliders, 
  Radio, 
  Activity 
} from "lucide-react";
import { useEffect, useState } from "react";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [wsStatus, setWsStatus] = useState<"connected" | "disconnected" | "connecting">("connecting");
  const [systemTime, setSystemTime] = useState<string>("");

  useEffect(() => {
    // Keep header clock synced
    setSystemTime(new Date().toLocaleDateString());
    const interval = setInterval(() => {
      setSystemTime(new Date().toLocaleDateString());
    }, 60000);

    // Setup active WebSocket tracker for connection status panel
    const wsUrl = "https://sui-sentinel.onrender.com";
    let socket: WebSocket;

    function connect() {
      setWsStatus("connecting");
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        setWsStatus("connected");
      };

      socket.onclose = () => {
        setWsStatus("disconnected");
        // Reconnect after 5 seconds
        setTimeout(connect, 5000);
      };

      socket.onerror = () => {
        setWsStatus("disconnected");
      };
    }

    connect();

    return () => {
      clearInterval(interval);
      if (socket) socket.close();
    };
  }, []);

  const navItems = [
    { name: "Overview", href: "/", icon: LayoutDashboard },
    { name: "Alerts Logs", href: "/alerts", icon: AlertOctagon },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Rules & Settings", href: "/settings", icon: Sliders },
  ];

  return (
    <html lang="en" className="h-full dark">
      <head>
        <title>Sui Sentinel - Autonomous DeFi Risk & Compliance Agent</title>
        <meta name="description" content="Autonomous AI-powered transaction analysis and on-chain compliance agent for the Sui Blockchain." />
      </head>
      <body className="h-full bg-[#030712] text-slate-100 cyber-grid flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-800 bg-[#070b19]/80 backdrop-blur-xl flex flex-col justify-between shrink-0">
          <div>
            {/* Brand Logo Header */}
            <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
              <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h1 className="font-bold text-sm tracking-wider text-slate-200 uppercase">Sui Sentinel</h1>
                <span className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase">DeFi Risk Agent</span>
              </div>
            </div>

            {/* Sidebar Navigation */}
            <nav className="p-4 space-y-1 mt-6">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-cyan-500/10 border-l-2 border-cyan-500 text-cyan-400"
                        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Footer Metadata */}
          <div className="p-4 border-t border-slate-800 space-y-4">
            {/* WebSocket stream status indicator */}
            <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-800/60">
              <div className="flex items-center space-x-2">
                <Radio className={`w-4 h-4 ${wsStatus === "connected" ? "text-cyan-400 animate-pulse" : "text-slate-500"}`} />
                <span className="text-[11px] font-mono text-slate-400 font-medium">Risk Stream</span>
              </div>
              <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                wsStatus === "connected" 
                  ? "bg-cyan-500/10 text-cyan-400" 
                  : wsStatus === "connecting"
                    ? "bg-amber-500/10 text-amber-400 animate-pulse"
                    : "bg-red-500/10 text-red-400"
              }`}>
                {wsStatus}
              </span>
            </div>

            {/* Node and Client Details */}
            <div className="flex items-center justify-between px-2">
              <span className="text-[11px] text-slate-500 flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-teal-dot" />
                <span>Sui RPC Testnet</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">v1.12.1</span>
            </div>
          </div>
        </aside>

        {/* Workspace Display Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header Panel */}
          <header className="h-16 border-b border-slate-800 bg-[#070b19]/40 backdrop-blur-md flex items-center justify-between px-8 shrink-0">
            <div>
              <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">CLOCK: {systemTime || "Loading..."}</span>
            </div>
            <div>
              <div className="flex items-center space-x-2 px-3.5 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 text-xs font-mono">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                <span>SECURE SENTINEL NODE ACTIVE</span>
              </div>
            </div>
          </header>

          {/* Core App Context */}
          <main className="flex-1 overflow-y-auto p-8 relative bg-[#02040a]/40">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
