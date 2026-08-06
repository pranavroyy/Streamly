import { useEffect, useRef, useState, useCallback } from "react";
import { Client, IMessage, StompHeaders } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import {
  SignalingStatus,
  SignalingMessage,
  ParticipantDto,
  SignalingLogEntry,
  SignalingMessageType,
} from "@/types/signaling";
import { calculateBackoffDelay } from "@/lib/utils";

export interface UseSignalingOptions {
  roomId?: string;
  userId?: string;
  autoConnect?: boolean;
  onMessage?: (msg: SignalingMessage) => void;
  onParticipantsUpdate?: (participants: ParticipantDto[]) => void;
}

// Spring Boot backend runs under /api context path -> endpoint is /api/ws
const DEFAULT_WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/api/ws";
const DEFAULT_SOCKJS_URL = process.env.NEXT_PUBLIC_SOCKJS_URL || "http://localhost:8080/api/ws";

export function useSignaling({
  roomId,
  userId,
  autoConnect = true,
  onMessage,
  onParticipantsUpdate,
}: UseSignalingOptions) {
  const [status, setStatus] = useState<SignalingStatus>("DISCONNECTED");
  const [reconnectAttempt, setReconnectAttempt] = useState<number>(0);
  const [participants, setParticipants] = useState<ParticipantDto[]>([]);
  const [logs, setLogs] = useState<SignalingLogEntry[]>([]);

  const clientRef = useRef<Client | null>(null);
  const isComponentMounted = useRef<boolean>(true);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentAttemptRef = useRef<number>(0);
  const isManuallyClosedRef = useRef<boolean>(false);

  // Helper to append a structured log entry
  const addLog = useCallback(
    (
      type: SignalingMessageType | "RECONNECT" | "SYSTEM",
      direction: "in" | "out" | "system",
      summary: string,
      details?: any
    ) => {
      const entry: SignalingLogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        timestamp: new Date().toLocaleTimeString(),
        type,
        direction,
        summary,
        details,
      };
      setLogs((prev) => [entry, ...prev.slice(0, 99)]); // Keep last 100 logs
    },
    []
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Calculate exponential backoff delay using shared helper (1s, 2s, 4s, 8s, max 16s + jitter)
  const getBackoffDelay = (attempt: number): number => {
    return calculateBackoffDelay(attempt, 1000, 16000, 300);
  };

  // Dispatch message to subscribers & local state
  const handleIncomingMessage = useCallback(
    (msg: SignalingMessage) => {
      addLog(
        msg.type,
        "in",
        `Received ${msg.type} ${msg.senderId ? `from ${msg.senderId}` : ""}`,
        msg
      );

      if (onMessage) {
        onMessage(msg);
      }

      // Automatically maintain participant list based on server signaling events
      if (msg.type === "ROOM_STATE" && Array.isArray(msg.payload)) {
        const list: ParticipantDto[] = msg.payload;
        setParticipants(list);
        if (onParticipantsUpdate) onParticipantsUpdate(list);
      } else if (msg.type === "JOIN" && msg.senderId) {
        setParticipants((prev) => {
          if (prev.some((p) => p.userId === msg.senderId)) return prev;
          const updated = [
            ...prev,
            { userId: msg.senderId!, joinedAt: new Date().toISOString() },
          ];
          if (onParticipantsUpdate) onParticipantsUpdate(updated);
          return updated;
        });
      } else if (msg.type === "LEAVE" && msg.senderId) {
        setParticipants((prev) => {
          const updated = prev.filter((p) => p.userId !== msg.senderId);
          if (onParticipantsUpdate) onParticipantsUpdate(updated);
          return updated;
        });
      }
    },
    [addLog, onMessage, onParticipantsUpdate]
  );

  // Send STOMP join message
  const sendJoin = useCallback(() => {
    if (!clientRef.current?.connected || !roomId || !userId) return;

    const joinMessage: SignalingMessage = {
      type: "JOIN",
      roomId,
      senderId: userId,
      payload: { userId },
    };

    clientRef.current.publish({
      destination: "/app/join",
      body: JSON.stringify(joinMessage),
    });

    addLog("JOIN", "out", `Sent JOIN request for room #${roomId}`, joinMessage);
  }, [roomId, userId, addLog]);

  // Connect STOMP WebSocket
  const connect = useCallback(() => {
    if (!roomId || !userId) {
      addLog("SYSTEM", "system", "Cannot connect: missing roomId or userId");
      return;
    }

    // Clean up existing client if present
    if (clientRef.current) {
      clientRef.current.deactivate();
      clientRef.current = null;
    }

    isManuallyClosedRef.current = false;
    setStatus((prev) => (prev === "RECONNECTING" ? "RECONNECTING" : "CONNECTING"));
    addLog("SYSTEM", "system", `Connecting to WebSocket endpoint (${DEFAULT_WS_URL})...`);

    const headers: StompHeaders = {
      userId: userId,
    };

    const client = new Client({
      brokerURL: DEFAULT_WS_URL,
      webSocketFactory: () => new SockJS(DEFAULT_SOCKJS_URL),
      connectHeaders: headers,
      reconnectDelay: 0, // We handle exponential backoff manually for status & logging transparency
      debug: () => {},
      onConnect: (frame) => {
        if (!isComponentMounted.current) return;
        setStatus("CONNECTED");
        currentAttemptRef.current = 0;
        setReconnectAttempt(0);
        addLog("SYSTEM", "system", "STOMP WebSocket connected successfully");

        // 1. Subscribe to public room topic (/topic/rooms/{roomId})
        client.subscribe(`/topic/rooms/${roomId}`, (message: IMessage) => {
          try {
            const parsed: SignalingMessage = JSON.parse(message.body);
            handleIncomingMessage(parsed);
          } catch (e) {
            addLog("ERROR", "in", "Failed to parse public topic message", message.body);
          }
        });

        // 2. Subscribe to private user queue (/user/queue/signaling)
        client.subscribe(`/user/queue/signaling`, (message: IMessage) => {
          try {
            const parsed: SignalingMessage = JSON.parse(message.body);
            handleIncomingMessage(parsed);
          } catch (e) {
            addLog("ERROR", "in", "Failed to parse private queue message", message.body);
          }
        });

        // 3. Send JOIN frame to server
        sendJoin();
      },

      onStompError: (frame) => {
        addLog("ERROR", "in", `STOMP Error: ${frame.headers["message"]}`, frame.body);
        setStatus("ERROR");
      },

      onWebSocketClose: (evt) => {
        addLog("SYSTEM", "system", "WebSocket connection closed");

        if (isManuallyClosedRef.current || !isComponentMounted.current) {
          setStatus("DISCONNECTED");
          return;
        }

        // Trigger exponential backoff reconnect
        setStatus("RECONNECTING");
        const nextAttempt = currentAttemptRef.current + 1;
        currentAttemptRef.current = nextAttempt;
        setReconnectAttempt(nextAttempt);

        const delay = getBackoffDelay(nextAttempt - 1);
        addLog(
          "RECONNECT",
          "system",
          `Reconnect attempt #${nextAttempt} scheduled in ${delay}ms`
        );

        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        reconnectTimeoutRef.current = setTimeout(() => {
          if (isComponentMounted.current && !isManuallyClosedRef.current) {
            connect();
          }
        }, delay);
      },

      onWebSocketError: (evt) => {
        addLog("ERROR", "system", "WebSocket transport error occurred");
      },
    });

    clientRef.current = client;
    client.activate();
  }, [roomId, userId, addLog, handleIncomingMessage, sendJoin]);

  // Clean disconnect
  const disconnect = useCallback(() => {
    isManuallyClosedRef.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (clientRef.current?.connected && roomId && userId) {
      // Send leave before deactivating
      const leaveMessage: SignalingMessage = {
        type: "LEAVE",
        roomId,
        senderId: userId,
        payload: { userId, reason: "User leaving room" },
      };
      try {
        clientRef.current.publish({
          destination: "/app/leave",
          body: JSON.stringify(leaveMessage),
        });
        addLog("LEAVE", "out", `Sent LEAVE request for room #${roomId}`);
      } catch (e) {
        // Ignore if socket already closed
      }
    }

    if (clientRef.current) {
      clientRef.current.deactivate();
      clientRef.current = null;
    }

    setStatus("DISCONNECTED");
    setParticipants([]);
    addLog("SYSTEM", "system", "Signaling client disconnected");
  }, [roomId, userId, addLog]);

  // Helper senders
  const sendOffer = useCallback(
    (targetId: string, sdp: string) => {
      if (!clientRef.current?.connected || !roomId || !userId) return;

      const offerMsg: SignalingMessage = {
        type: "OFFER",
        roomId,
        senderId: userId,
        targetId,
        payload: { sdp },
      };

      clientRef.current.publish({
        destination: "/app/offer",
        body: JSON.stringify(offerMsg),
      });

      addLog("OFFER", "out", `Relayed SDP Offer to ${targetId}`, offerMsg);
    },
    [roomId, userId, addLog]
  );

  const sendAnswer = useCallback(
    (targetId: string, sdp: string) => {
      if (!clientRef.current?.connected || !roomId || !userId) return;

      const answerMsg: SignalingMessage = {
        type: "ANSWER",
        roomId,
        senderId: userId,
        targetId,
        payload: { sdp },
      };

      clientRef.current.publish({
        destination: "/app/answer",
        body: JSON.stringify(answerMsg),
      });

      addLog("ANSWER", "out", `Relayed SDP Answer to ${targetId}`, answerMsg);
    },
    [roomId, userId, addLog]
  );

  const sendIceCandidate = useCallback(
    (targetId: string, candidate: any) => {
      if (!clientRef.current?.connected || !roomId || !userId) return;

      const iceMsg: SignalingMessage = {
        type: "ICE_CANDIDATE",
        roomId,
        senderId: userId,
        targetId,
        payload: candidate,
      };

      clientRef.current.publish({
        destination: "/app/ice",
        body: JSON.stringify(iceMsg),
      });

      addLog("ICE_CANDIDATE", "out", `Relayed ICE Candidate to ${targetId}`, iceMsg);
    },
    [roomId, userId, addLog]
  );

  const sendLeave = useCallback(() => {
    disconnect();
  }, [disconnect]);

  const sendStartRecording = useCallback(() => {
    if (!clientRef.current?.connected || !roomId || !userId) return;

    const startMsg: SignalingMessage = {
      type: "START_RECORDING",
      roomId,
      senderId: userId,
      payload: { timestamp: new Date().toISOString() },
    };

    clientRef.current.publish({
      destination: `/topic/rooms/${roomId}`,
      body: JSON.stringify(startMsg),
    });

    addLog("START_RECORDING", "out", `Broadcast START_RECORDING to room #${roomId}`, startMsg);
  }, [roomId, userId, addLog]);

  const sendStopRecordingSignal = useCallback(() => {
    if (!clientRef.current?.connected || !roomId || !userId) return;

    const stopMsg: SignalingMessage = {
      type: "STOP_RECORDING",
      roomId,
      senderId: userId,
      payload: { timestamp: new Date().toISOString() },
    };

    clientRef.current.publish({
      destination: `/topic/rooms/${roomId}`,
      body: JSON.stringify(stopMsg),
    });

    addLog("STOP_RECORDING", "out", `Broadcast STOP_RECORDING to room #${roomId}`, stopMsg);
  }, [roomId, userId, addLog]);

  // Simulate network drop for testing exponential backoff reconnect
  const simulateNetworkDrop = useCallback(() => {
    addLog("SYSTEM", "system", "Simulating network drop...");
    if (clientRef.current?.webSocket) {
      clientRef.current.webSocket.close();
    }
  }, [addLog]);

  // Effect: Auto-connect on entry, disconnect on unmount/leave
  useEffect(() => {
    isComponentMounted.current = true;

    if (autoConnect && roomId && userId) {
      connect();
    }

    return () => {
      isComponentMounted.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (clientRef.current) {
        if (clientRef.current.connected && roomId && userId) {
          try {
            clientRef.current.publish({
              destination: "/app/leave",
              body: JSON.stringify({
                type: "LEAVE",
                roomId,
                senderId: userId,
                payload: { userId, reason: "Component unmounted" },
              }),
            });
          } catch (e) {}
        }
        clientRef.current.deactivate();
      }
    };
  }, [autoConnect, roomId, userId]);

  return {
    status,
    reconnectAttempt,
    participants,
    logs,
    connect,
    disconnect,
    sendOffer,
    sendAnswer,
    sendIceCandidate,
    sendLeave,
    sendStartRecording,
    sendStopRecordingSignal,
    clearLogs,
    simulateNetworkDrop,
  };
}
