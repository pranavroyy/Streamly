"use client";

import React, { memo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Radio, LayoutDashboard, LogOut, User as UserIcon, Sun, Moon } from "lucide-react";

interface NavbarProps {
  isLoading?: boolean;
  isError?: boolean;
}

const Navbar: React.FC<NavbarProps> = memo(({ isLoading, isError }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="w-full border-b border-zinc-200 dark:border-zinc-800/80 bg-white/70 dark:bg-black/40 backdrop-blur-md px-6 py-3.5 flex items-center justify-between z-30 transition-colors">
      <Link href="/" className="flex items-center gap-2.5 group">
        <div className="bg-purple-600 p-2 rounded-xl text-white shadow-md shadow-purple-600/20 group-hover:bg-purple-500 transition-colors">
          <Radio className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white transition-colors">
            Streamly
          </span>
        </div>
        <span className="text-[10px] font-medium tracking-wider bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 px-2 py-0.5 rounded font-mono">
          Studio
        </span>
      </Link>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Status Indicator Pill */}
        <div className="hidden sm:flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full px-3.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 transition-colors">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isLoading
                ? "bg-amber-500"
                : isError
                ? "bg-red-500"
                : "bg-emerald-500"
            }`}
          />
          <span className="font-medium">
            {isLoading ? "Connecting..." : isError ? "Offline" : "System Ready"}
          </span>
        </div>

        {/* Theme Switcher Button */}
        <button
          onClick={toggleTheme}
          type="button"
          aria-label="Toggle theme"
          className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-all"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-600" />
          )}
        </button>

        {isAuthenticated ? (
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full px-3.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-300">
              <UserIcon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span className="font-medium">{user?.fullName || "Creator"}</span>
            </div>

            <Link
              href="/dashboard"
              prefetch={true}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white rounded-full px-4 py-1.5 text-xs font-medium transition-all shadow-sm"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>

            <button
              onClick={logout}
              className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-500/10 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-all rounded-full p-2 text-xs font-medium"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              prefetch={true}
              className="text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white px-3 py-1.5 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              prefetch={true}
              className="bg-purple-600 hover:bg-purple-500 text-white rounded-full px-4 py-1.5 text-xs font-medium transition-all shadow-sm"
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
