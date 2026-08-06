"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { roomsApi, RoomResponse, ParticipantResponse } from "@/lib/roomsApi";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSignaling } from "@/hooks/useSignaling";
import { useCopyClipboard } from "@/hooks/useCopyClipboard";
import { isRoomOwner } from "@/lib/utils";

const DeleteRoomModal = dynamic(() => import("@/components/DeleteRoomModal"), {
  ssr: false,
});
import { SignalingLogEntry, SignalingMessage } from "@/types/signaling";
import { useMediaDevices } from "@/hooks/useMediaDevices";
import { usePeerConnections } from "@/hooks/usePeerConnections";
import { useRecorder } from "@/hooks/useRecorder";
import { PermissionGate } from "@/components/webrtc/PermissionGate";
import { VideoGrid } from "@/components/webrtc/VideoGrid";
import { MediaControls } from "@/components/webrtc/MediaControls";
import { 
  Radio, 
  ArrowLeft, 
  Users, 
  Crown, 
  Copy, 
  Check, 
  LogOut, 
  Trash2, 
  Loader2, 
  Video,
  Mic,
  AlertCircle,
  RefreshCw,
  Terminal,
  Trash,
  ChevronRight,
  ChevronDown,
  Zap,
  Activity
} from "lucide-react";

function RoomDetailContent() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();

  const [room, setRoom] = useState<RoomResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Copy clipboard hook
  const { copied, copy } = useCopyClipboard();

  // Log Panel State
  const [showLogPanel, setShowLogPanel] = useState(true);
  const [logFilter, setLogFilter] = useState<"ALL" | "SIGNALING" | "WEBRTC" | "ERROR">("ALL");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const roomIdStr = Array.isArray(id) ? id[0] : id;
  const currentUserId = user?.id ? String(user.id) : user?.email || "";

  // WebRTC Media Capture Hook
  const {
    localStream,
    mediaError,
    isRequesting,
    requestMedia,
    stopMedia,
  } = useMediaDevices();

  const [localMuted, setLocalMuted] = useState(false);
  const [localCameraOff, setLocalCameraOff] = useState(false);

  // Ref to route signaling messages to the WebRTC orchestrator without circular dependency
  const webrtcSignalHandlerRef = useRef<((msg: any) => void) | null>(null);

  // 1. Initial REST fetch for room baseline
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

  // Silent background refresh for room participant list
  const refreshRoomData = useCallback(async () => {
    if (!roomIdStr) return;
    try {
      const data = await roomsApi.getRoom(roomIdStr);
      setRoom(data);
    } catch (e) {
      // Ignore background refresh errors
    }
  }, [roomIdStr]);

  useEffect(() => {
    fetchRoomDetails();
  }, [fetchRoomDetails]);

  const isRecordingRef = useRef(false);
  const startRecordingRef = useRef<() => void>();
  const stopRecordingRef = useRef<() => void>();

  // Handle incoming WS events to refresh room state, sync recording, and route to WebRTC
  const handleWsMessage = useCallback(
    (msg: SignalingMessage) => {
      if (msg.type === "JOIN" || msg.type === "LEAVE" || msg.type === "ROOM_STATE") {
        refreshRoomData();
      }
      if (msg.type === "START_RECORDING") {
        if (!isRecordingRef.current) {
          startRecordingRef.current?.();
        }
      }
      if (msg.type === "STOP_RECORDING") {
        if (isRecordingRef.current) {
          stopRecordingRef.current?.();
        }
      }
      if (webrtcSignalHandlerRef.current) {
        webrtcSignalHandlerRef.current(msg);
      }
    },
    [refreshRoomData]
  );

  // 2. Initialize WS Signaling Hook (`useSignaling`)
  const {
    status: wsStatus,
    reconnectAttempt,
    participants: wsParticipants,
    logs: signalingLogs,
    connect: wsConnect,
    disconnect: wsDisconnect,
    sendOffer,
    sendAnswer,
    sendIceCandidate,
    sendLeave: wsSendLeave,
    sendStartRecording,
    sendStopRecordingSignal,
    clearLogs,
    simulateNetworkDrop,
  } = useSignaling({
    roomId: roomIdStr,
    userId: currentUserId,
    autoConnect: !!room && !!currentUserId,
    onMessage: handleWsMessage,
  });

  // Sync REST participant list with real-time WS updates
  const displayParticipants = useMemo(() => {
    if (!room) return [];
    const restParticipants = room.participants || [];

    if (wsParticipants.length === 0) return restParticipants;

    const existingMap = new Map<string, ParticipantResponse>();
    restParticipants.forEach((p) => {
      existingMap.set(String(p.userId), p);
    });

    return wsParticipants.map((wp, index) => {
      const wpUserIdStr = String(wp.userId);
      const existing = existingMap.get(wpUserIdStr);
      if (existing) return existing;

      // Fallback formatting if REST data is still loading
      const isCurrent = wpUserIdStr === currentUserId;
      return {
        id: Date.now() + index,
        roomId: Number(roomIdStr),
        userId: Number(wp.userId) || index + 900,
        userEmail: wp.userId.includes("@") ? wp.userId : `user-${wp.userId}@streamly.local`,
        userFullName: isCurrent ? user?.fullName || `User ${wp.userId}` : `User ${wp.userId}`,
        role: "SPEAKER" as const,
        joinedAt: wp.joinedAt || new Date().toISOString(),
      };
    });
  }, [room, wsParticipants, currentUserId, user, roomIdStr]);

  // 3. Initialize Peer Connection Orchestration Hook (`usePeerConnections`)
  const {
    peers,
    disconnectAll,
    handleSignalingMessage,
  } = usePeerConnections({
    localStream,
    currentUserId,
    participants: wsParticipants,
    sendOffer,
    sendAnswer,
    sendIceCandidate,
  });

  // 4. Initialize Local Media Stream Recorder Hook (`useRecorder`)
  const {
    isRecording,
    formattedTime,
    startRecording,
    stopRecording,
  } = useRecorder(localStream);

  useEffect(() => {
    isRecordingRef.current = isRecording;
    startRecordingRef.current = startRecording;
    stopRecordingRef.current = stopRecording;
  }, [isRecording, startRecording, stopRecording]);

  const handleToggleRecord = useCallback(() => {
    if (isRecording) {
      sendStopRecordingSignal();
    } else {
      sendStartRecording();
    }
  }, [isRecording, sendStartRecording, sendStopRecordingSignal]);

  // Link signaling handler ref
  useEffect(() => {
    webrtcSignalHandlerRef.current = handleSignalingMessage;
    return () => {
      webrtcSignalHandlerRef.current = null;
    };
  }, [handleSignalingMessage]);

  const handleCopyInvite = () => {
    if (typeof window !== "undefined") {
      const inviteCode = room?.code || roomIdStr;
      copy(`${window.location.origin}/rooms/${inviteCode}`);
    }
  };

  const handleJoinCall = async () => {
    try {
      const stream = await requestMedia();
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !localMuted;
      });
      stream.getVideoTracks().forEach((track) => {
        track.enabled = !localCameraOff;
      });
    } catch (err) {
      console.error("Failed to start camera/microphone:", err);
    }
  };

  const handleToggleMute = useCallback(() => {
    setLocalMuted((prev) => {
      const next = !prev;
      if (localStream) {
        localStream.getAudioTracks().forEach((track) => {
          track.enabled = !next;
        });
      }
      return next;
    });
  }, [localStream]);

  const handleToggleCamera = useCallback(() => {
    setLocalCameraOff((prev) => {
      const next = !prev;
      if (localStream) {
        localStream.getVideoTracks().forEach((track) => {
          track.enabled = !next;
        });
      }
      return next;
    });
  }, [localStream]);

  const handleLeave = async () => {
    if (!roomIdStr) return;
    setLeaving(true);
    try {
      if (isRecording) {
        sendStopRecordingSignal();
      }
      stopRecording();
      disconnectAll();
      stopMedia();
      wsSendLeave();
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
      if (isRecording) {
        sendStopRecordingSignal();
      }
      stopRecording();
      disconnectAll();
      stopMedia();
      wsSendLeave();
      await roomsApi.deleteRoom(roomIdStr);
      setShowDeleteConfirm(false);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to delete room");
      setDeleting(false);
    }
  };

  const isOwner = isRoomOwner(room, user);

  // Filter signaling logs
  const filteredLogs = useMemo(() => {
    return signalingLogs.filter((log) => {
      if (logFilter === "ALL") return true;
      if (logFilter === "ERROR") return log.type === "ERROR" || log.direction === "system";
      if (logFilter === "SIGNALING") return log.type === "JOIN" || log.type === "LEAVE" || log.type === "ROOM_STATE";
      if (logFilter === "WEBRTC") return log.type === "OFFER" || log.type === "ANSWER" || log.type === "ICE_CANDIDATE";
      return true;
    });
  }, [signalingLogs, logFilter]);

  // Construct Video Tiles mapping local + active peers
  const tiles = useMemo(() => {
    const list: any[] = [];
    
    // Add local tile first
    if (localStream) {
      list.push({
        userId: currentUserId,
        stream: localStream,
        label: user?.fullName || "You",
        isMuted: localMuted,
        isCameraOff: localCameraOff,
        isLocal: true,
      });
    }

    // Add active remote peers from signaling list
    displayParticipants.forEach((p) => {
      const peerId = String(p.userId);
      if (peerId === currentUserId) return;

      const peerState = peers.get(peerId);
      const remoteStream = peerState?.remoteStream || null;

      // Heuristic: check if tracks are ended, disabled, or absent
      const isPeerCameraOff = !remoteStream || 
        remoteStream.getVideoTracks().length === 0 || 
        remoteStream.getVideoTracks()[0].readyState === "ended" ||
        !remoteStream.getVideoTracks()[0].enabled;
        
      const isPeerMuted = !remoteStream || 
        remoteStream.getAudioTracks().length === 0 || 
        remoteStream.getAudioTracks()[0].readyState === "ended" ||
        !remoteStream.getAudioTracks()[0].enabled;

      list.push({
        userId: peerId,
        stream: remoteStream,
        label: p.userFullName || `User ${peerId}`,
        isMuted: isPeerMuted,
        isCameraOff: isPeerCameraOff,
        connectionState: peerState?.connectionState,
        isLocal: false,
      });
    });

    return list;
  }, [localStream, currentUserId, user, localMuted, localCameraOff, displayParticipants, peers]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col justify-between transition-colors">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-purple-500/5 dark:bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Studio Header */}
      <header className="w-full border-b border-zinc-200 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/90 backdrop-blur-md px-6 py-4 flex items-center justify-between z-40 sticky top-0 shadow-sm transition-colors">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            prefetch={true}
            className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all flex items-center gap-2 text-xs font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />

          <div className="flex items-center gap-2">
            <div className="bg-purple-600 p-1.5 rounded-lg text-white">
              <Radio className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-white tracking-tight">Studio Session</span>
          </div>

          {/* WebSocket Status Indicator Pill */}
          <div className="ml-2 flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono border bg-zinc-900/90 shadow-sm">
            {wsStatus === "CONNECTED" && (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-400 font-semibold">WS Connected</span>
              </>
            )}
            {wsStatus === "CONNECTING" && (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                <span className="text-amber-400">WS Connecting...</span>
              </>
            )}
            {wsStatus === "RECONNECTING" && (
              <>
                <RefreshCw className="w-3 h-3 animate-spin text-orange-400" />
                <span className="text-orange-400 font-semibold">
                  Reconnecting (#{reconnectAttempt})
                </span>
              </>
            )}
            {(wsStatus === "DISCONNECTED" || wsStatus === "ERROR") && (
              <>
                <span className="h-2 w-2 rounded-full bg-red-500"></span>
                <span className="text-red-400 font-semibold">WS Disconnected</span>
                <button
                  onClick={() => wsConnect()}
                  className="ml-1 text-[10px] text-purple-400 underline hover:text-purple-300"
                >
                  Reconnect
                </button>
              </>
            )}
          </div>
        </div>

        {room && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowLogPanel((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                showLogPanel
                  ? "bg-purple-600/20 border-purple-500/40 text-purple-300"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Signaling Logs ({signalingLogs.length})</span>
            </button>

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

      {/* Main Layout Area */}
      <main className="max-w-7xl w-full mx-auto p-6 md:p-8 flex-1 flex flex-col gap-8 z-0">
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Main Section (Room info & Participants) */}
            <div className={`space-y-8 ${showLogPanel ? "lg:col-span-7" : "lg:col-span-12"}`}>
              {/* Room Banner */}
              <div className="bg-gradient-to-r from-purple-900/40 via-zinc-900 to-zinc-950 border border-purple-500/30 p-6 md:p-8 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full">
                      {room.status}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">Room Code: {room.code || `#${room.id}`}</span>
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

                <div className="flex flex-col gap-2 bg-zinc-900/80 border border-zinc-800 p-3.5 rounded-xl text-xs">
                  <div className="flex items-center gap-2 text-purple-300 font-medium">
                    <Video className="w-4 h-4 text-purple-400" />
                    <span>1080p Local Track</span>
                  </div>
                  <div className="h-px w-full bg-zinc-800" />
                  <div className="flex items-center gap-2 text-indigo-300 font-medium">
                    <Mic className="w-4 h-4 text-indigo-400" />
                    <span>Audio 48kHz WAV</span>
                  </div>
                </div>
              </div>

              {/* Video Grid Section */}
              <div className="space-y-4">
                {!localStream ? (
                  <PermissionGate
                    mediaError={mediaError}
                    isRequesting={isRequesting}
                    onRequestMedia={handleJoinCall}
                  />
                ) : (
                  <div className="space-y-6">
                    <VideoGrid tiles={tiles} />
                    <div className="flex justify-center pt-2">
                      <MediaControls
                        isMuted={localMuted}
                        isCameraOff={localCameraOff}
                        isRecording={isRecording}
                        formattedTime={formattedTime}
                        onToggleMute={handleToggleMute}
                        onToggleCamera={handleToggleCamera}
                        onToggleRecord={handleToggleRecord}
                        onLeave={handleLeave}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Section: Real-time Signaling Log & WebRTC Controls Panel */}
            {showLogPanel && (
              <div className="lg:col-span-5 flex flex-col gap-4 bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-5 shadow-2xl backdrop-blur-md">
                {/* Panel Header */}
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-400 animate-pulse" />
                    <h3 className="font-bold text-white text-sm">Signaling & WebRTC Event Log</h3>
                  </div>
                  <button
                    onClick={clearLogs}
                    className="p-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all text-xs flex items-center gap-1"
                    title="Clear Log"
                  >
                    <Trash className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                </div>

                {/* WebRTC Debug Tools */}
                <div className="bg-black/50 border border-zinc-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                    <span className="flex items-center gap-1 text-purple-300">
                      <Zap className="w-3.5 h-3.5" /> WebRTC Debug Tools
                    </span>
                  </div>

                  <button
                    onClick={simulateNetworkDrop}
                    className="w-full bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 py-1.5 px-2.5 rounded-lg transition-all text-[11px] font-mono"
                    title="Simulate connection drop to test exponential backoff reconnect"
                  >
                    Simulate WS Connection Drop
                  </button>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl text-[11px] font-semibold">
                  {(["ALL", "SIGNALING", "WEBRTC", "ERROR"] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setLogFilter(filter)}
                      className={`flex-1 py-1 rounded-lg transition-all ${
                        logFilter === filter
                          ? "bg-purple-600 text-white shadow-sm"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                {/* Scrollable Event Stream */}
                <div className="flex-1 min-h-[340px] max-h-[460px] overflow-y-auto space-y-2 pr-1 font-mono text-xs scrollbar-thin scrollbar-thumb-zinc-700">
                  {filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-zinc-500 text-xs gap-2">
                      <Terminal className="w-6 h-6 opacity-40" />
                      <span>No signaling events captured yet.</span>
                    </div>
                  ) : (
                    filteredLogs.map((log) => {
                      const isExpanded = expandedLogId === log.id;

                      let badgeStyle = "bg-zinc-800 text-zinc-300 border-zinc-700";
                      if (log.type === "JOIN" || log.type === "ROOM_STATE") badgeStyle = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
                      if (log.type === "LEAVE") badgeStyle = "bg-amber-500/10 text-amber-400 border-amber-500/30";
                      if (log.type === "OFFER" || log.type === "ANSWER" || log.type === "ICE_CANDIDATE") badgeStyle = "bg-indigo-500/10 text-indigo-400 border-indigo-500/30";
                      if (log.type === "ERROR") badgeStyle = "bg-red-500/10 text-red-400 border-red-500/30";
                      if (log.type === "RECONNECT") badgeStyle = "bg-orange-500/10 text-orange-400 border-orange-500/30";

                      return (
                        <div
                          key={log.id}
                          className="bg-black/60 border border-zinc-800/80 rounded-xl p-2.5 space-y-1.5 transition-all hover:border-zinc-700"
                        >
                          <div
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="flex items-center justify-between cursor-pointer select-none"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-zinc-500">{log.timestamp}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${badgeStyle}`}>
                                {log.type}
                              </span>
                              <span className={`text-[9px] uppercase font-bold ${
                                log.direction === "in" ? "text-emerald-400" : log.direction === "out" ? "text-purple-400" : "text-amber-400"
                              }`}>
                                [{log.direction}]
                              </span>
                            </div>

                            {log.details && (
                              <button className="text-zinc-500 hover:text-zinc-300">
                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>

                          <p className="text-zinc-300 text-[11px] leading-snug">{log.summary}</p>

                          {isExpanded && log.details && (
                            <pre className="bg-zinc-950 p-2 rounded-lg text-[10px] text-zinc-400 overflow-x-auto border border-zinc-900 mt-1">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Reusable Delete Room Confirmation Modal */}
      <DeleteRoomModal
        isOpen={showDeleteConfirm}
        roomName={room?.name}
        isDeleting={deleting}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
      />

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
