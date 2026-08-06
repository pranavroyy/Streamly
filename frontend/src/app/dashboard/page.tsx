"use client";

import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { roomsApi, RoomResponse } from "@/lib/roomsApi";
import Navbar from "@/components/Navbar";
import RoomCard from "@/components/RoomCard";
import { useRouter } from "next/navigation";

const RoomActionModal = dynamic(() => import("@/components/RoomActionModal"), {
  ssr: false,
});
import { 
  Video, 
  Plus, 
  ShieldCheck, 
  Sliders, 
  HardDrive,
  Link2,
  RefreshCw,
  Loader2,
  Tv
} from "lucide-react";

function DashboardContent() {
  const { user } = useAuth();
  const router = useRouter();

  const [rooms, setRooms] = useState<RoomResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalState, setModalState] = useState<{ isOpen: boolean; mode: "create" | "join" }>({
    isOpen: false,
    mode: "create",
  });

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await roomsApi.listMyRooms();
      setRooms(data);
    } catch (err: any) {
      setError(err.message || "Failed to load studio rooms");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleSuccess = useCallback((result: RoomResponse | number | string) => {
    fetchRooms();
    const targetId = typeof result === "object" ? (result.code || result.id) : result;
    router.push(`/rooms/${targetId}`);
  }, [fetchRooms, router]);

  const closeModal = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col justify-between transition-colors">
      {/* Background glow */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-purple-500/5 dark:bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Shared Modular Navbar */}
      <Navbar />

      {/* Main Studio Body */}
      <main className="max-w-6xl w-full mx-auto p-6 md:p-8 flex-1 flex flex-col gap-8 z-10">
        
        {/* Welcome & Quick Action Banner */}
        <div className="bg-gradient-to-r from-purple-500/10 via-zinc-100 to-zinc-50 dark:from-purple-900/30 dark:via-zinc-900/80 dark:to-zinc-900/40 border border-purple-200 dark:border-purple-500/20 p-8 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-colors">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-500/10 px-3.5 py-1 rounded-full border border-purple-200 dark:border-purple-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              Authenticated Session
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
              Welcome back, {user?.fullName || "Creator"}!
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
              Signed in as <span className="text-purple-600 dark:text-purple-300 font-mono">{user?.email}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setModalState({ isOpen: true, mode: "create" })}
              className="flex-1 md:flex-none bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl font-medium text-xs shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Studio Room</span>
            </button>

            <button
              onClick={() => setModalState({ isOpen: true, mode: "join" })}
              className="flex-1 md:flex-none bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 px-5 py-2.5 rounded-xl font-medium text-xs transition-all flex items-center justify-center gap-2"
            >
              <Link2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Join by Code/Link</span>
            </button>
          </div>
        </div>

        {/* Room List Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Tv className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">Your Studio Rooms</h2>
              <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs px-2.5 py-0.5 rounded-full font-mono font-medium">
                {rooms.length}
              </span>
            </div>

            <button
              onClick={fetchRooms}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900"
              title="Refresh Room List"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-xs p-4 rounded-xl font-medium">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-500 bg-white dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800/60 rounded-2xl">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
              <p className="text-xs font-medium">Loading your studio rooms...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 gap-4 text-center bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl transition-colors">
              <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-600/10 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Video className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">No Studio Rooms Yet</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
                  Create a new studio room to start recording, or join an existing session with an invite code.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setModalState({ isOpen: true, mode: "create" })}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Create Room
                </button>
                <button
                  onClick={() => setModalState({ isOpen: true, mode: "join" })}
                  className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5"
                >
                  <Link2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Join Room
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {rooms.map((room) => (
                <RoomCard key={room.id} room={room} onRefresh={fetchRooms} />
              ))}
            </div>
          )}
        </section>

        {/* Feature Capabilities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-zinc-200 dark:border-zinc-800/60">
          <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl space-y-3 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-600/10 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Video className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-xs text-zinc-900 dark:text-white">Multi-track Recording</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Capture independent uncompressed audio & video streams directly on client hardware.
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl space-y-3 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-600/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <HardDrive className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-xs text-zinc-900 dark:text-white">Reliable Cloud Sync</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Local media chunks are automatically synchronized and uploaded securely.
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl space-y-3 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-600/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Sliders className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-xs text-zinc-900 dark:text-white">Role-Based Control</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Host controls room lifecycle while participants join seamlessly via direct link.
            </p>
          </div>
        </div>

      </main>

      {/* Unified Room Action Modal */}
      <RoomActionModal
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        onClose={closeModal}
        onSuccess={handleSuccess}
      />

      {/* Footer */}
      <footer className="w-full border-t border-zinc-200 dark:border-zinc-800/80 py-4 text-center text-xs text-zinc-500 transition-colors">
        Streamly Studio Platform &copy; 2026. All rights reserved.
      </footer>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
