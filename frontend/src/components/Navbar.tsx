"use client";

import React, { memo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Radio, LayoutDashboard, LogOut, User as UserIcon } from "lucide-react";

interface NavbarProps {
  isLoading?: boolean;
  isError?: boolean;
}

const Navbar: React.FC<NavbarProps> = memo(({ isLoading, isError }) => {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="w-full border-b border-zinc-800/80 bg-black/40 backdrop-blur-md px-6 py-3.5 flex items-center justify-between z-30">
      <Link href="/" className="flex items-center gap-2.5 group">
        <div className="bg-purple-600 p-2 rounded-xl text-white shadow-lg shadow-purple-600/20 group-hover:bg-purple-500 transition-colors">
          <Radio className="w-5 h-5 animate-pulse" />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-bold tracking-tight text-white group-hover:text-zinc-200 transition-colors">
            Streamly
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-widest bg-purple-950 text-purple-400 border border-purple-800/60 px-2 py-0.5 rounded font-mono">
          Studio
        </span>
      </Link>

      <div className="flex items-center gap-4">
        {/* Status Indicator Dot */}
        <div className="hidden sm:flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-3.5 py-1.5 text-xs text-zinc-300">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isLoading
                ? "bg-amber-400 animate-ping"
                : isError
                ? "bg-red-500"
                : "bg-emerald-400 animate-pulse"
            }`}
          />
          <span className="font-medium text-white">
            {isLoading ? "Connecting..." : isError ? "Offline" : "Infrastructure Ready"}
          </span>
        </div>

        {isAuthenticated ? (
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-3.5 py-1.5 text-xs text-zinc-300">
              <UserIcon className="w-3.5 h-3.5 text-purple-400" />
              <span className="font-medium text-white">{user?.fullName || "Streamly Creator"}</span>
            </div>

            <Link
              href="/dashboard"
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white rounded-full px-4 py-1.5 text-xs font-semibold transition-all shadow-lg shadow-purple-600/20"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>

            <button
              onClick={logout}
              className="flex items-center gap-2 bg-zinc-900 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/40 text-zinc-400 hover:text-red-400 transition-all rounded-full p-2 text-xs font-medium"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-medium text-zinc-300 hover:text-white px-3 py-1.5 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="bg-purple-600 hover:bg-purple-500 text-white rounded-full px-4 py-1.5 text-xs font-semibold transition-all shadow-lg shadow-purple-600/20"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
});

Navbar.displayName = "Navbar";
export default Navbar;
