"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { 
  Radio, 
  Activity, 
  Video, 
  Settings, 
  Plus, 
  Users, 
  FolderLock, 
  Layers,
  Sparkles,
  Server
} from "lucide-react";

interface HealthData {
  status: string;
  message: string;
  timestamp: string;
}

export default function HomePage() {
  // Query to fetch the backend health check
  const { data: health, isLoading, isError, error } = useQuery<HealthData>({
    queryKey: ["healthCheck"],
    queryFn: async () => {
      const response = await api.get("/v1/health");
      return response.data;
    },
    refetchInterval: 10000, // Poll every 10 seconds
  });

  return (
    <div className="relative min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-900 via-black to-zinc-950 flex flex-col justify-between overflow-x-hidden">
      
      {/* Background glowing effects */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="w-full border-b border-zinc-800/80 bg-black/40 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-2 rounded-lg text-white shadow-lg shadow-primary/20">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Streamly
          </span>
          <span className="text-[10px] uppercase tracking-widest bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono border border-zinc-700">
            Studio
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800/80 rounded-full px-4 py-1.5 text-xs text-zinc-400">
            <Server className="w-3.5 h-3.5" />
            <span>Backend status:</span>
            {isLoading ? (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            ) : isError ? (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            ) : (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
            <span className="font-medium text-zinc-300">
              {isLoading ? "Checking..." : isError ? "Offline" : "Healthy"}
            </span>
          </div>

          <button className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 transition-all rounded-full p-2">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl w-full mx-auto p-6 md:p-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 z-10">
        
        {/* Left Column: Quick Actions & State Status */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-br from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
              High-Fidelity Podcast Recording
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-md">
              Streamly records studio-quality local video & audio streams directly on each guest's device and uploads them seamlessly to the cloud.
            </p>
          </div>

          {/* Quick Create Room Card */}
          <div className="glass-panel rounded-2xl p-6 flex flex-col gap-4 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <h2 className="font-semibold text-zinc-200 flex items-center gap-2">
                <Video className="w-4 h-4 text-purple-400" />
                Launch Recording Studio
              </h2>
              <span className="text-[11px] text-zinc-500 font-mono">v0.1.0</span>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-zinc-400 font-medium mb-1 block">Session Name</label>
                <input 
                  type="text" 
                  placeholder="Weekly Design Sync" 
                  className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-sm text-zinc-200 placeholder:text-zinc-600 rounded-lg px-3.5 py-2.5 outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-medium mb-1 block">Recording Mode</label>
                <select className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-primary/50 text-sm text-zinc-300 rounded-lg px-3.5 py-2.5 outline-none transition-all">
                  <option>Audio & Video (Separate High-Quality Tracks)</option>
                  <option>Audio Only (High-Quality wav/mp3)</option>
                </select>
              </div>
            </div>

            <button className="w-full bg-primary hover:bg-primary/90 text-white font-medium text-sm py-3 px-4 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/35 transition-all mt-2 group">
              <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
              Create Room Invite Link
            </button>
          </div>

          {/* Connection / Health Inspector */}
          <div className="glass-card rounded-2xl p-5 border-zinc-800/50 flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-zinc-400" />
              Infrastructure Status
            </h3>

            <div className="flex flex-col gap-2.5 bg-black/40 border border-zinc-900 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">PostgreSQL Database</span>
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Online (Healthy)
                </span>
              </div>
              <div className="h-px bg-zinc-900" />
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Spring Boot REST API</span>
                {isLoading ? (
                  <span className="text-amber-400">Connecting...</span>
                ) : isError ? (
                  <span className="text-red-400">Disconnected</span>
                ) : (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Running
                  </span>
                )}
              </div>
              
              {health && (
                <>
                  <div className="h-px bg-zinc-900" />
                  <div className="flex flex-col gap-1 text-[11px] font-mono text-zinc-500">
                    <p className="text-zinc-400 text-xs mt-1">Message: "{health.message}"</p>
                    <p className="mt-0.5">Response Time: {new Date(health.timestamp).toLocaleTimeString()}</p>
                  </div>
                </>
              )}

              {isError && (
                <>
                  <div className="h-px bg-zinc-900" />
                  <div className="text-[11px] font-mono text-red-400">
                    Error connecting: Please verify docker containers are running.
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Right Column: Platform Features & Guidelines */}
        <section className="lg:col-span-7 flex flex-col justify-between gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Feature 1 */}
            <div className="glass-card hover:bg-zinc-900/30 transition-all rounded-xl p-5 border-zinc-800/40 flex flex-col gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">Local Multi-Track Recording</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Captures high-resolution video and lossless audio tracks locally on each client device, unaffected by fluctuating internet quality.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-card hover:bg-zinc-900/30 transition-all rounded-xl p-5 border-zinc-800/40 flex flex-col gap-3">
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">WebRTC Real-time Pipeline</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Seamless peer-to-peer real-time communication between hosts and guests with ultra-low latency signaling driven by WebSockets.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card hover:bg-zinc-900/30 transition-all rounded-xl p-5 border-zinc-800/40 flex flex-col gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">AI Integration & Ollama</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Process summaries, timestamps, notes, and auto-generated transcripts locally using offline Ollama models.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="glass-card hover:bg-zinc-900/30 transition-all rounded-xl p-5 border-zinc-800/40 flex flex-col gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <FolderLock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">Production-Ready Architecture</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                A clean Spring Boot + JPA backend decoupled from a TypeScript Next.js frontend, organized under robust Clean Architecture patterns.
              </p>
            </div>

          </div>

          {/* Quick Studio guidelines banner */}
          <div className="bg-gradient-to-r from-purple-900/20 to-indigo-900/10 border border-purple-500/10 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-4 justify-between">
            <div className="flex flex-col gap-1 text-center md:text-left">
              <h4 className="text-sm font-semibold text-zinc-200 flex items-center gap-1.5 justify-center md:justify-start">
                Ready for high-quality production
              </h4>
              <p className="text-xs text-zinc-400">
                Compile backend dependencies and run docker compose to see health updates instantly.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="h-2 w-2 rounded-full bg-purple-500 animate-ping" />
              <span className="text-xs text-purple-400 font-medium">Auto-connecting to db...</span>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="w-full border-t border-zinc-900 px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 z-10">
        <p>© 2026 Streamly Inc. All rights reserved.</p>
        <div className="flex gap-4 mt-2 sm:mt-0 font-medium">
          <a href="#" className="hover:text-zinc-400 transition-colors">Privacy Policy</a>
          <span>•</span>
          <a href="#" className="hover:text-zinc-400 transition-colors">Terms of Service</a>
        </div>
      </footer>

    </div>
  );
}
