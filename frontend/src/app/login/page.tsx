"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Radio, Mail, Lock, AlertCircle, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!password) {
      newErrors.password = "Password is required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      router.push("/dashboard");
    } catch (err: any) {
      setErrors({
        general: err?.message || "Invalid credentials. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-zinc-50 dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] dark:from-zinc-900 dark:via-black dark:to-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 transition-colors">
      {/* Background glowing effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-purple-500/5 dark:bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md space-y-8 z-10">
        
        {/* Header Branding */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
            <div className="bg-purple-600 p-2.5 rounded-xl text-white shadow-md transition-transform group-hover:scale-105">
              <Radio className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Streamly</span>
          </Link>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Welcome back
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            Sign in to access your podcast studio and recordings
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 backdrop-blur-xl p-8 rounded-2xl shadow-sm dark:shadow-2xl transition-colors">
          
          {/* General Server Error Alert */}
          {errors.general && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 flex items-start gap-3 text-red-600 dark:text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errors.general}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 border ${
                    errors.email ? "border-red-500" : "border-zinc-200 dark:border-zinc-800 focus:border-purple-500"
                  } rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 text-sm focus:outline-none transition-all`}
                  placeholder="alex@streamly.fm"
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 border ${
                    errors.password ? "border-red-500" : "border-zinc-200 dark:border-zinc-800 focus:border-purple-500"
                  } rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 text-sm focus:outline-none transition-all`}
                  placeholder="••••••••"
                />
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.password}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-2 group"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Registration Link Footer */}
          <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800/80 text-center">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Don't have an account?{" "}
              <Link
                href="/register"
                prefetch={true}
                className="font-medium text-purple-600 dark:text-purple-400 hover:underline transition-colors"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
