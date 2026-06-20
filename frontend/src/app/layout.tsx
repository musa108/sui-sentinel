"use client";

import { usePathname } from "next/navigation";
import { WS_URL } from "@/config";
import Link from "next/link";
import Image from "next/image";
import { 
  LayoutDashboard, 
  AlertOctagon, 
  BarChart3, 
  Sliders, 
  Radio, 
  Activity,
  Menu,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { Plus_Jakarta_Sans, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-space-grotesk",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [wsStatus, setWsStatus] = useState<"connected" | "disconnected" | "connecting">("connecting");
  const [systemTime, setSystemTime] = useState<string>("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Keep header clock synced (deferred to avoid synchronous state update in effect body)
    const updateTime = () => setSystemTime(new Date().toLocaleDateString());
    const timer = setTimeout(updateTime, 0);
    const interval = setInterval(updateTime, 60000);

    // Setup active WebSocket tracker for connection status panel
    const wsUrl = WS_URL;
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
      clearTimeout(timer);
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
    <html lang="en" className={`h-full dark ${plusJakarta.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <head>
        <title>Sui Sentinel - Autonomous DeFi Risk & Compliance Agent</title>
        <meta name="description" content="Autonomous AI-powered transaction analysis and on-chain compliance agent for the Sui Blockchain." />
        <link rel="icon" href="/sui_sentinel_logo.png" />
      </head>
      <body className="h-full bg-[#02040a] text-slate-100 cyber-grid flex flex-col lg:flex-row overflow-hidden antialiased">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-68 border-r border-slate-900 bg-[#060a17]/95 backdrop-blur-xl flex-col justify-between shrink-0 shadow-xl shadow-black/40 z-30">
          <div>
            {/* Brand Logo Header */}
            <div className="p-6 border-b border-slate-900/50 flex items-center space-x-3 bg-gradient-to-b from-slate-950/20 to-transparent">
              <div className="p-1 rounded-xl bg-cyan-500/5 border border-cyan-500/15 text-cyan-400">
                <Image src="/sui_sentinel_logo.png" alt="Sui Sentinel Logo" width={36} height={36} className="object-contain" />
              </div>
              <div>
                <h1 className="font-display font-bold text-sm tracking-wider text-slate-100 uppercase">Sui Sentinel</h1>
                <span className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase">DeFi Risk Agent</span>
              </div>
            </div>

            {/* Sidebar Navigation */}
            <nav className="p-4 space-y-1.5 mt-6">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-cyan-500/10 border-l-2 border-cyan-400 text-cyan-400 font-semibold"
                        : "text-slate-400 hover:bg-slate-900/40 hover:text-slate-100"
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
          <div className="p-4 border-t border-slate-900/80 space-y-4">
            {/* WebSocket stream status indicator */}
            <div className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-900/60">
              <div className="flex items-center space-x-2">
                <Radio className={`w-4 h-4 ${wsStatus === "connected" ? "text-cyan-400 animate-pulse" : "text-slate-500"}`} />
                <span className="text-[11px] font-mono text-slate-400 font-semibold">Risk Stream</span>
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
              <span className="text-[11px] text-slate-500 flex items-center space-x-1.5 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-teal-dot" />
                <span>Sui RPC Testnet</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">v1.12.1</span>
            </div>
          </div>
        </aside>

        {/* Mobile Header Bar */}
        <header className="lg:hidden h-16 border-b border-slate-900/80 bg-[#060a17]/95 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-40 shadow-md">
          <div className="flex items-center space-x-2.5">
            <Image src="/sui_sentinel_logo.png" alt="Sui Sentinel Logo" width={28} height={28} className="object-contain" />
            <div>
              <h1 className="font-display font-bold text-xs tracking-wider text-slate-200 uppercase leading-none">Sui Sentinel</h1>
              <span className="text-[9px] text-cyan-400 font-mono tracking-widest uppercase">DeFi Risk Agent</span>
            </div>
          </div>
          
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-800 rounded-lg"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>

        {/* Mobile Menu Slide-over Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex animate-fade-in">
            {/* Overlay backdrop */}
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            {/* Drawer panel */}
            <aside className="relative flex flex-col w-4/5 max-w-sm h-full bg-[#060a17] border-r border-slate-900 p-6 z-50 justify-between">
              <div>
                <div className="flex justify-between items-center pb-4 border-b border-slate-900">
                  <div className="flex items-center space-x-2.5">
                    <Image src="/sui_sentinel_logo.png" alt="Sui Sentinel Logo" width={32} height={32} className="object-contain" />
                    <div>
                      <h1 className="font-display font-bold text-sm tracking-wider text-slate-200 uppercase">Sui Sentinel</h1>
                      <span className="text-[9px] text-cyan-400 font-mono tracking-widest uppercase">DeFi Risk Agent</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-100 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="mt-8 space-y-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? "bg-cyan-500/10 border-l-2 border-cyan-400 text-cyan-400 font-semibold"
                            : "text-slate-400 hover:bg-slate-900/40 hover:text-slate-100"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* Mobile Drawer Footer */}
              <div className="space-y-4 border-t border-slate-900 pt-6">
                <div className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-900/60">
                  <div className="flex items-center space-x-2">
                    <Radio className={`w-4 h-4 ${wsStatus === "connected" ? "text-cyan-400 animate-pulse" : "text-slate-500"}`} />
                    <span className="text-[11px] font-mono text-slate-400">Risk Stream</span>
                  </div>
                  <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                    wsStatus === "connected" ? "bg-cyan-500/10 text-cyan-400" : "bg-red-500/10 text-red-400"
                  }`}>
                    {wsStatus}
                  </span>
                </div>

                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] text-slate-500 flex items-center space-x-1.5 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-teal-dot" />
                    <span>Sui RPC Testnet</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">v1.12.1</span>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* Workspace Display Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header Panel */}
          <header className="hidden lg:flex h-16 border-b border-slate-900 bg-[#060a17]/40 backdrop-blur-md items-center justify-between px-8 shrink-0 z-20">
            <div>
              <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">CLOCK: {systemTime || "Loading..."}</span>
            </div>
            <div>
              <div className="flex items-center space-x-2.5 px-4 py-1.5 bg-cyan-500/5 border border-cyan-500/15 rounded-full text-cyan-400 text-xs font-mono">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                <span className="font-semibold uppercase tracking-wider">SECURE SENTINEL NODE ACTIVE</span>
              </div>
            </div>
          </header>

          {/* Core App Context */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative bg-slate-950/40">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
