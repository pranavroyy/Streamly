"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { roomsApi } from "@/lib/roomsApi";
import { useAuth } from "@/context/AuthContext";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import { MiniSoundwaveBars } from "@/components/AnimatedAudioWaveform";

const AnimatedAudioWaveform = dynamic(
  () => import("@/components/AnimatedAudioWaveform"),
  { ssr: false }
);
import { 
  Video, 
  Link2, 
  Mic, 
  ArrowRight, 
  Loader2, 
  HardDrive, 
  ShieldCheck,
  Activity,
  CheckCircle2,
  Lock,
  Sparkles
} from "lucide-react";

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"create" | "join">("create");
  const [sessionName, setSessionName] = useState("");
  const [joinInput, setJoinInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
      router.push(`/rooms/${room.code || room.id}`);
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

    const trimmed = joinInput.trim();
    if (!trimmed) {
      setFormError("Please enter a valid Room Code or invite link");
      return;
    }

    const match = trimmed.match(/\/rooms\/([^\/?#]+)/);
    const identifier = match ? match[1].trim() : trimmed;

    setLoading(true);
    try {
      await roomsApi.joinRoom(identifier);
      router.push(`/rooms/${identifier}`);
    } catch (err: any) {
      setFormError(err.message || "Failed to join room.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, joinInput, router]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] dark:from-zinc-900 dark:via-black dark:to-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col justify-between relative transition-colors">
      
      {/* Background accents */}
      <div className="absolute -top-32 -left-32 w-[400px] h-[400px] bg-purple-500/5 dark:bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 -right-32 w-[400px] h-[400px] bg-indigo-500/5 dark:bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Navigation */}
      <Navbar />

      {/* Main Content */}
      <main className="max-w-6xl w-full mx-auto px-6 md:px-8 pt-8 pb-16 flex-1 flex flex-col gap-12 z-10">
        
        {/* Minimal Asymmetric Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center pt-2">
          
          {/* Left Column */}
          <div className="lg:col-span-6 flex flex-col items-start text-left space-y-5">
            
            <div className="inline-flex items-center gap-2 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-3 py-1 rounded-full border border-purple-200 dark:border-purple-800/60">
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              <span>Studio Quality Multi-Track</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-semibold text-zinc-900 dark:text-white tracking-tight leading-tight">
              High-Fidelity Audio & Video. <br />
              <span className="text-purple-600 dark:text-purple-400">
                Zero Compression Loss.
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal max-w-lg">
              Streamly records uncompressed 4K video & 48kHz audio tracks directly on local client hardware—unaffected by connection dropouts.
            </p>

            {/* Quick Action Box */}
            <div className="w-full max-w-md bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm dark:shadow-xl space-y-4 transition-colors">
              
              <div className="grid grid-cols-2 p-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium">
                <button
                  type="button"
                  onClick={() => { setActiveTab("create"); setFormError(null); }}
                  className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === "create"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Create Studio</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab("join"); setFormError(null); }}
                  className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === "join"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Join Session</span>
                </button>
              </div>

              {formError && (
                <div className="text-xs bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 p-3 rounded-xl font-medium">
                  {formError}
                </div>
              )}

              {activeTab === "create" ? (
                <form onSubmit={handleCreateRoom} className="space-y-3">
                  <div className="space-y-1">
                    <label htmlFor="homepage-session-name" className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                      Studio Session Name
                    </label>
                    <input
                      id="homepage-session-name"
                      type="text"
                      placeholder="e.g. Episode #42: Tech Discussion"
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-purple-500 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 rounded-xl px-3.5 py-2.5 outline-none transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Video className="w-3.5 h-3.5" />
                        <span>Launch Studio Room</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleJoinRoom} className="space-y-3">
                  <div className="space-y-1">
                    <label htmlFor="homepage-join-code" className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                      Room Code or Invite Link
                    </label>
                    <input
                      id="homepage-join-code"
                      type="text"
                      placeholder="e.g. rm-b75epa"
                      value={joinInput}
                      onChange={(e) => setJoinInput(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 rounded-xl px-3.5 py-2.5 outline-none transition-colors font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Link2 className="w-3.5 h-3.5" />
                        <span>Join Studio</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {!isAuthenticated && (
                <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 pt-1">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-purple-500" /> Authentication required
                  </span>
                  <div className="flex items-center gap-2 font-medium">
                    <Link href="/login" prefetch={true} className="text-purple-600 dark:text-purple-400 hover:underline">
                      Sign In
                    </Link>
                    <span>•</span>
                    <Link href="/register" prefetch={true} className="text-purple-600 dark:text-purple-400 hover:underline">
                      Register
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 font-medium pt-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>4K Master</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-500" />
                <span>48kHz WAV</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>WebRTC Mesh</span>
              </div>
            </div>

          </div>

          {/* Right Column: Sleek Studio Card */}
          <div className="lg:col-span-6 relative">
            <div className="w-full bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm dark:shadow-xl space-y-4 transition-colors">
              
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-zinc-900 dark:text-white">Multi-Track Active</span>
                </div>
                <span className="text-[10px] font-mono bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded">
                  1080p 60fps
                </span>
              </div>

              {/* Audio Waveform */}
              <AnimatedAudioWaveform barCount={24} heightClass="h-10" />

              {/* Track Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 flex flex-col justify-between h-28">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-1.5 py-0.5 rounded font-mono font-medium">
                      Host
                    </span>
                    <div className="flex items-center gap-1.5">
                      <MiniSoundwaveBars count={5} />
                      <Mic className="w-3 h-3 text-emerald-500" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-900 dark:text-white">Streamly Host</p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">48kHz Audio</p>
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 flex flex-col justify-between h-28">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded font-mono font-medium">
                      Guest
                    </span>
                    <div className="flex items-center gap-1.5">
                      <MiniSoundwaveBars count={5} />
                      <Mic className="w-3 h-3 text-emerald-500" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-900 dark:text-white">Remote Guest</p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">Synced</p>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Minimal Feature Row */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-6 border-t border-zinc-200 dark:border-zinc-800/60">
          <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 p-5 rounded-xl text-left space-y-2 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-600/10 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Video className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-xs text-zinc-900 dark:text-white">Multi-Track Capture</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Independent video & audio tracks recorded on local client hardware.
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 p-5 rounded-xl text-left space-y-2 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-600/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <HardDrive className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-xs text-zinc-900 dark:text-white">Background Sync</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Local media chunks synchronize smoothly in the background.
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 p-5 rounded-xl text-left space-y-2 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-600/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-xs text-zinc-900 dark:text-white">Role Controls</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Host manages studio room lifecycle while participants join via direct link.
            </p>
          </div>
        </section>

      </main>

      <footer className="w-full border-t border-zinc-200 dark:border-zinc-800/80 py-3 text-center text-xs text-zinc-500 z-10 transition-colors">
        Streamly Studio Platform &copy; 2026
      </footer>

    </div>
  );
}
