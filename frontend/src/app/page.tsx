"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { roomsApi } from "@/lib/roomsApi";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { 
  Video, 
  Sparkles, 
  Link2, 
  Mic, 
  ArrowRight, 
  Loader2, 
  HardDrive, 
  ShieldCheck 
} from "lucide-react";

interface HealthData {
  status: string;
  message: string;
  timestamp: string;
}

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"create" | "join">("create");
  const [sessionName, setSessionName] = useState("");
  const [joinInput, setJoinInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { isLoading, isError } = useQuery<HealthData>({
    queryKey: ["healthCheck"],
    queryFn: async () => {
      const response = await api.get("/v1/health");
      return response.data;
    },
    refetchInterval: 10000,
  });

  const handleCreateRoom = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    const name = sessionName.trim() || "New Studio Session";
    setLoading(true);

    try {
      const room = await roomsApi.createRoom({ name });
      router.push(`/rooms/${room.id}`);
    } catch (err: any) {
      setFormError(err.message || "Failed to create studio room.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, sessionName, router]);

  const handleJoinRoom = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (!joinInput.trim()) {
      setFormError("Please enter a valid Room ID or link");
      return;
    }

    const match = joinInput.trim().match(/\/rooms\/(\d+)/);
    const roomId = match ? match[1] : joinInput.trim();

    setLoading(true);
    try {
      await roomsApi.joinRoom(roomId);
      router.push(`/rooms/${roomId}`);
    } catch (err: any) {
      setFormError(err.message || "Failed to join room.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, joinInput, router]);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-zinc-950 flex flex-col justify-between relative overflow-hidden">
      
      {/* Background glow matching Dashboard */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Shared Modular Navbar */}
      <Navbar isLoading={isLoading} isError={isError} />

      {/* Main Content */}
      <main className="max-w-5xl w-full mx-auto p-6 md:p-8 pt-6 md:pt-10 pb-16 flex-1 flex flex-col items-center gap-10 z-10 text-center">
        
        {/* Hero Headline & Subtitle */}
        <div className="w-full max-w-3xl flex flex-col items-center text-center gap-4">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-3.5 py-1 rounded-full border border-purple-500/20">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>High-Fidelity Multi-Track Recording</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-[1.1]">
            Studio Quality Recording. <br />
            <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-purple-300 bg-clip-text text-transparent">
              Zero Compression Loss.
            </span>
          </h1>

          <p className="text-sm md:text-base text-zinc-400 leading-relaxed font-normal max-w-xl">
            Streamly captures separate 4K video and 48kHz audio tracks directly on each participant's machine—unaffected by poor internet connection.
          </p>
        </div>

        {/* Studio Quick Action Box */}
        <div className="w-full max-w-md bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
          
          {/* Segmented Tab Switcher */}
          <div className="grid grid-cols-2 p-1 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setActiveTab("create"); setFormError(null); }}
              className={`py-2 rounded-lg transition-all ${
                activeTab === "create"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Create Studio
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab("join"); setFormError(null); }}
              className={`py-2 rounded-lg transition-all ${
                activeTab === "join"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Join Session
            </button>
          </div>

          {formError && (
            <div className="text-xs bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl font-medium text-left">
              {formError}
            </div>
          )}

          {/* Tab 1: Create */}
          {activeTab === "create" ? (
            <form onSubmit={handleCreateRoom} className="space-y-3.5 text-left">
              <div className="space-y-1.5">
                <label htmlFor="homepage-session-name" className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Studio Session Name
                </label>
                <input
                  id="homepage-session-name"
                  type="text"
                  placeholder="e.g. Episode #42: Tech Discussion"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 text-xs text-white placeholder-zinc-500 rounded-xl px-4 py-3 outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs py-3.5 px-5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Video className="w-4 h-4" />
                    <span>Launch Studio Room</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Tab 2: Join */
            <form onSubmit={handleJoinRoom} className="space-y-3.5 text-left">
              <div className="space-y-1.5">
                <label htmlFor="homepage-join-code" className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Room ID or Invite Link
                </label>
                <input
                  id="homepage-join-code"
                  type="text"
                  placeholder="e.g. 100 or http://localhost:3000/rooms/100"
                  value={joinInput}
                  onChange={(e) => setJoinInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-xs text-white placeholder-zinc-500 rounded-xl px-4 py-3 outline-none transition-all font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-3.5 px-5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Link2 className="w-4 h-4" />
                    <span>Join Studio</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {!isAuthenticated && (
            <p className="text-[11px] text-zinc-500">
              * Requires authentication to host or participate in studio rooms.
            </p>
          )}
        </div>

        {/* Visual Studio Session Card matching Dashboard Cards */}
        <div className="w-full max-w-2xl bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 text-left space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-white">Live Multi-Track Studio Active</span>
            </div>
            <span className="text-[10px] uppercase font-mono tracking-widest bg-purple-950 text-purple-400 border border-purple-800/60 px-2.5 py-0.5 rounded">
              1080p Local Track
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between h-32">
              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                <span className="bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded font-mono font-medium">Host</span>
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Streamly Host</p>
                <p className="text-[10px] text-zinc-400 font-mono">48kHz WAV Audio</p>
              </div>
            </div>

            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between h-32">
              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                <span className="bg-zinc-800 text-zinc-300 border border-zinc-700 px-2 py-0.5 rounded font-mono font-medium">Guest</span>
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Remote Guest</p>
                <p className="text-[10px] text-emerald-400 font-mono font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Sync Complete
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Dashboard-Style Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl pt-2">
          
          <div className="bg-zinc-900/60 border border-zinc-800 p-6 rounded-xl space-y-3 text-left">
            <div className="w-10 h-10 rounded-lg bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Video className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base text-white">Multi-Track Recording</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Capture independent uncompressed audio & video streams directly on client hardware.
            </p>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-6 rounded-xl space-y-3 text-left">
            <div className="w-10 h-10 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base text-white">Reliable Cloud Sync</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Local media chunks are automatically synchronized and uploaded securely.
            </p>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-6 rounded-xl space-y-3 text-left">
            <div className="w-10 h-10 rounded-lg bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base text-white">Role-Based Control</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Host controls room lifecycle while participants join seamlessly via direct link.
            </p>
          </div>

        </div>

      </main>

      {/* Footer matching Dashboard */}
      <footer className="w-full border-t border-zinc-800/80 py-4 text-center text-xs text-zinc-500 z-10">
        Streamly Studio Platform &copy; 2026. All rights reserved.
      </footer>

    </div>
  );
}
