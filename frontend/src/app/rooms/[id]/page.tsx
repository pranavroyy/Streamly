"use client";

import React, { useEffect, useState, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { roomsApi, RoomResponse } from "@/lib/roomsApi";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Radio, 
  ArrowLeft, 
  Users, 
  Crown, 
  Shield, 
  Copy, 
  Check, 
  LogOut, 
  Trash2, 
  Loader2, 
  Video,
  Mic,
  AlertCircle
} from "lucide-react";

function RoomDetailContent() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();

  const [room, setRoom] = useState<RoomResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const roomIdStr = Array.isArray(id) ? id[0] : id;

  const fetchRoomDetails = useCallback(async () => {
    if (!roomIdStr) return;
    setLoading(true);
    setError(null);
    try {
      const data = await roomsApi.getRoom(roomIdStr);
      setRoom(data);
    } catch (err: any) {
      setError(err.message || "Failed to load room details");
    } finally {
      setLoading(false);
    }
  }, [roomIdStr]);

  useEffect(() => {
    fetchRoomDetails();
  }, [fetchRoomDetails]);

  const handleCopyInvite = () => {
    if (typeof window !== "undefined") {
      const url = window.location.href;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLeave = async () => {
    if (!roomIdStr) return;
    setLeaving(true);
    try {
      await roomsApi.leaveRoom(roomIdStr);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to leave room");
      setLeaving(false);
    }
  };

  const handleDelete = async () => {
    if (!roomIdStr) return;
    setDeleting(true);
    try {
      await roomsApi.deleteRoom(roomIdStr);
      setShowDeleteConfirm(false);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to delete room");
      setDeleting(false);
    }
  };

  const isOwner = user?.id && room ? room.ownerId === user.id : user?.fullName === room?.ownerName;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-zinc-950 flex flex-col justify-between">
      {/* Glow background */}
      <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="w-full border-b border-zinc-800/80 bg-black/40 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all flex items-center gap-2 text-xs font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>

          <div className="h-4 w-px bg-zinc-800" />

          <div className="flex items-center gap-2">
            <div className="bg-purple-600 p-1.5 rounded-lg text-white">
              <Radio className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-white tracking-tight">Studio Session</span>
          </div>
        </div>

        {room && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyInvite}
              className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Invite Link</span>
                </>
              )}
            </button>

            <button
              onClick={handleLeave}
              disabled={leaving}
              className="flex items-center gap-1.5 bg-zinc-900 hover:bg-amber-500/10 border border-zinc-800 hover:border-amber-500/30 text-zinc-300 hover:text-amber-400 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all"
            >
              {leaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
              <span>Leave Room</span>
            </button>

            {isOwner && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleting}
                className="flex items-center gap-1.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Delete Room</span>
              </button>
            )}
          </div>
        )}
      </header>

      {/* Main Studio View */}
      <main className="max-w-6xl w-full mx-auto p-6 md:p-8 flex-1 flex flex-col gap-8 z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-zinc-500 bg-zinc-900/30 border border-zinc-800/60 rounded-2xl">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            <p className="text-sm font-medium">Connecting to studio room...</p>
          </div>
        ) : error || !room ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6">
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-md">
              <h3 className="text-lg font-bold text-white">Studio Unavailable</h3>
              <p className="text-xs text-zinc-400">{error || "Room could not be loaded."}</p>
            </div>
            <Link
              href="/dashboard"
              className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-lg shadow-purple-600/20 transition-all"
            >
              Return to Dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Room Title Header Banner */}
            <div className="bg-gradient-to-r from-purple-900/40 via-zinc-900 to-zinc-950 border border-purple-500/30 p-6 md:p-8 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full">
                    {room.status}
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">Room ID: #{room.id}</span>
                </div>
                <h1 className="text-3xl font-extrabold text-white">{room.name}</h1>
                <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                  <span>Host:</span>
                  <span className="text-white font-medium">{room.ownerName}</span>
                  {isOwner && (
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ml-1">
                      <Crown className="w-3 h-3" /> Owner
                    </span>
                  )}
                </p>
              </div>

              {/* Action summary */}
              <div className="flex items-center gap-3 bg-zinc-900/80 border border-zinc-800 p-3.5 rounded-xl text-xs">
                <div className="flex items-center gap-2 text-purple-300">
                  <Video className="w-4 h-4" />
                  <span>1080p Local Track ready</span>
                </div>
                <div className="h-4 w-px bg-zinc-800" />
                <div className="flex items-center gap-2 text-indigo-300">
                  <Mic className="w-4 h-4" />
                  <span>Audio 48kHz WAV</span>
                </div>
              </div>
            </div>

            {/* Participants Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-bold text-lg">
                  <Users className="w-5 h-5 text-purple-400" />
                  <h2>Room Participants ({room.participants?.length || 0})</h2>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {room.participants?.map((p) => {
                  const isCurrent = user?.email === p.userEmail;
                  const isHost = p.role === "HOST";

                  return (
                    <div
                      key={p.id}
                      className="bg-zinc-900/70 border border-zinc-800/90 rounded-xl p-4 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border ${
                          isHost 
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30" 
                            : "bg-purple-600/10 text-purple-400 border-purple-500/20"
                        }`}>
                          {p.userFullName ? p.userFullName.charAt(0).toUpperCase() : "U"}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-sm">{p.userFullName}</span>
                            {isCurrent && (
                              <span className="text-[9px] bg-purple-950 text-purple-300 border border-purple-800 px-1.5 py-0.2 rounded font-mono">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 font-mono">{p.userEmail}</p>
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${
                        isHost
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-zinc-800 text-zinc-300 border-zinc-700"
                      }`}>
                        {p.role}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h4 className="font-bold text-white text-base">Delete Studio Room?</h4>
            <p className="text-xs text-zinc-400">
              Deleting <span className="text-white font-semibold">{room?.name}</span> will end the session for all participants. This action is permanent.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white rounded-lg border border-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-md shadow-red-600/30 transition-all flex items-center gap-1.5"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full border-t border-zinc-800/80 py-4 text-center text-xs text-zinc-500">
        Streamly Studio Platform &copy; 2026. All rights reserved.
      </footer>
    </div>
  );
}

export default function RoomDetailPage() {
  return (
    <ProtectedRoute>
      <RoomDetailContent />
    </ProtectedRoute>
  );
}
