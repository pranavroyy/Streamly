"use client";

import React from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { 
  Radio, 
  LogOut, 
  User as UserIcon, 
  Video, 
  Plus, 
  Sparkles, 
  ShieldCheck, 
  Sliders, 
  Clock,
  HardDrive
} from "lucide-react";

function DashboardContent() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-zinc-950 flex flex-col justify-between">
      {/* Background glow */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="w-full border-b border-zinc-800/80 bg-black/40 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10">
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-purple-600 p-2 rounded-lg text-white shadow-lg shadow-purple-600/20">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Streamly</span>
          <span className="text-[10px] uppercase tracking-widest bg-purple-950 text-purple-400 border border-purple-800/60 px-2 py-0.5 rounded font-mono">
            Dashboard
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1.5 text-xs text-zinc-300">
            <UserIcon className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-medium text-white">{user?.fullName || "Streamly Creator"}</span>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/40 text-zinc-400 hover:text-red-400 transition-all rounded-full px-4 py-1.5 text-xs font-medium"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Studio Body */}
      <main className="max-w-6xl w-full mx-auto p-6 md:p-8 flex-1 flex flex-col gap-8 z-10">
        
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-purple-900/30 via-zinc-900/80 to-zinc-900/40 border border-purple-500/20 p-8 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              Authenticated Session
            </div>
            <h1 className="text-3xl font-extrabold text-white">
              Welcome back, {user?.fullName || "Creator"}!
            </h1>
            <p className="text-sm text-zinc-400">
              Signed in as <span className="text-purple-300 font-mono">{user?.email}</span>
            </p>
          </div>

          <button className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-3 rounded-xl font-medium text-sm shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Studio Session
          </button>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-900/60 border border-zinc-800 p-6 rounded-xl space-y-4">
            <div className="w-10 h-10 rounded-lg bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Video className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg text-white">Recording Studio</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Launch high-definition multi-track local recording for audio & video streams.
            </p>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-6 rounded-xl space-y-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg text-white">Cloud Storage</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Local media chunks are automatically synchronized and uploaded securely.
            </p>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-6 rounded-xl space-y-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Sliders className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg text-white">Audio Settings</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Configure noise suppression, gain control, and sample rate settings.
            </p>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full border-t border-zinc-800/80 py-4 text-center text-xs text-zinc-500">
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
