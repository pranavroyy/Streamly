import { useState, useCallback, useEffect, useRef } from "react";
import { ParticipantDto, SignalingMessage } from "@/types/signaling";
import { createPeerConnection, shouldInitiateConnection } from "@/lib/webrtc";

export interface PeerState {
  connection: RTCPeerConnection;
  remoteStream: MediaStream | null;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
}

export interface UsePeerConnectionsOptions {
  localStream: MediaStream | null;
  currentUserId: string;
  participants: ParticipantDto[];
  sendOffer: (targetId: string, sdp: string) => void;
  sendAnswer: (targetId: string, sdp: string) => void;
  sendIceCandidate: (targetId: string, candidate: any) => void;
}

export function usePeerConnections({
  localStream,
  currentUserId,
  participants,
  sendOffer,
  sendAnswer,
  sendIceCandidate,
}: UsePeerConnectionsOptions) {
  const [peers, setPeers] = useState<Map<string, PeerState>>(new Map());

  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const iceQueueRef = useRef<Map<string, any[]>>(new Map());
  const iceRestartAttemptedRef = useRef<Map<string, boolean>>(new Map());

  // Helper to update a peer's state
  const updatePeerState = useCallback((peerId: string, updates: Partial<PeerState>) => {
    setPeers((prev) => {
      const next = new Map(prev);
      const current = next.get(peerId);
      if (current) {
        next.set(peerId, { ...current, ...updates });
      }
      return next;
    });
  }, []);

  // Helper to attach/update localStream tracks to an RTCPeerConnection
  const syncLocalTracksToPeer = useCallback(
    (pc: RTCPeerConnection) => {
      if (!localStream) return;
      const senders = pc.getSenders();

      localStream.getTracks().forEach((track) => {
        const existingSender = senders.find(
          (s) => (s.track && s.track.kind === track.kind) || s.track === null
        );

        if (existingSender) {
          if (existingSender.track !== track) {
            existingSender.replaceTrack(track).catch((err) => {
              console.error(`Error replacing track for kind ${track.kind}:`, err);
            });
          }
        } else {
          try {
            pc.addTrack(track, localStream);
          } catch (err) {
            console.error(`Error adding track for kind ${track.kind}:`, err);
          }
        }
      });
    },
    [localStream]
  );

  // Disconnect from a specific peer
  const disconnectPeer = useCallback((peerId: string) => {
    console.log(`Closing peer connection with ${peerId}`);
    const pc = peerConnectionsRef.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(peerId);
    }
    remoteStreamsRef.current.delete(peerId);
    setPeers((prev) => {
      const next = new Map(prev);
      next.delete(peerId);
      return next;
    });
    iceQueueRef.current.delete(peerId);
    iceRestartAttemptedRef.current.delete(peerId);
  }, []);

  // Disconnect from all peers and reset states
  const disconnectAll = useCallback(() => {
    console.log("Disconnecting all active peer connections");
    peerConnectionsRef.current.forEach((pc) => {
      try {
        pc.close();
      } catch (e) {}
    });
    peerConnectionsRef.current.clear();
    remoteStreamsRef.current.clear();
    setPeers(new Map());
    iceQueueRef.current.clear();
    iceRestartAttemptedRef.current.clear();
  }, []);

  // Create an RTCPeerConnection for a remote peer
  const createConnectionForPeer = useCallback(
    (peerId: string) => {
      if (peerConnectionsRef.current.has(peerId)) {
        const existingPc = peerConnectionsRef.current.get(peerId)!;
        syncLocalTracksToPeer(existingPc);
        return existingPc;
      }

      console.log(`Creating RTCPeerConnection for peer: ${peerId}`);
      const pc = createPeerConnection();
      peerConnectionsRef.current.set(peerId, pc);

      // Initialize state mapping
      setPeers((prev) => {
        const next = new Map(prev);
        next.set(peerId, {
          connection: pc,
          remoteStream: null,
          connectionState: pc.connectionState,
          iceConnectionState: pc.iceConnectionState,
        });
        return next;
      });

      // Add local tracks to transmit to the peer
      syncLocalTracksToPeer(pc);

      // ICE Candidate generation event
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendIceCandidate(peerId, event.candidate.toJSON());
        }
      };

      // Remote track arrival event
      pc.ontrack = (event) => {
        console.log(`Received remote track (${event.track.kind}) on pc for ${peerId}`);

        let stream = remoteStreamsRef.current.get(peerId);
        if (!stream) {
          stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream();
          remoteStreamsRef.current.set(peerId, stream);
        }

        if (!stream.getTracks().some((t) => t.id === event.track.id)) {
          stream.addTrack(event.track);
        }

        const refreshStreamState = () => {
          const activeTracks = stream!.getTracks();
          updatePeerState(peerId, {
            remoteStream: activeTracks.length > 0 ? new MediaStream(activeTracks) : null,
          });
        };

        event.track.onmute = refreshStreamState;
        event.track.onunmute = refreshStreamState;
        event.track.onended = refreshStreamState;

        refreshStreamState();
      };

      // Connection state listeners
      const handleStateChange = () => {
        updatePeerState(peerId, {
          connectionState: pc.connectionState,
          iceConnectionState: pc.iceConnectionState,
        });

        const iceState = pc.iceConnectionState;
        console.log(`ICE Connection state for ${peerId}: ${iceState}`);

        // Attempt exactly one ICE restart on failed/disconnected state
        if (iceState === "failed" || iceState === "disconnected") {
          if (!iceRestartAttemptedRef.current.get(peerId)) {
            iceRestartAttemptedRef.current.set(peerId, true);
            const delay = iceState === "disconnected" ? 5000 : 0;
            console.log(`Scheduling ICE restart for ${peerId} in ${delay}ms`);

            setTimeout(async () => {
              const currentPc = peerConnectionsRef.current.get(peerId);
              if (
                currentPc &&
                (currentPc.iceConnectionState === "failed" ||
                  currentPc.iceConnectionState === "disconnected")
              ) {
                try {
                  console.log(`Executing ICE restart re-negotiation for ${peerId}`);
                  currentPc.restartIce();
                  const offer = await currentPc.createOffer();
                  await currentPc.setLocalDescription(offer);
                  sendOffer(peerId, offer.sdp || "");
                } catch (err) {
                  console.error(`ICE Restart failed for peer ${peerId}:`, err);
                }
              }
            }, delay);
          }
        }
      };

      pc.onconnectionstatechange = handleStateChange;
      pc.oniceconnectionstatechange = handleStateChange;

      return pc;
    },
    [sendIceCandidate, sendOffer, syncLocalTracksToPeer, updatePeerState]
  );

  // Sync localStream tracks to all active peer connections whenever localStream changes
  useEffect(() => {
    peerConnectionsRef.current.forEach((pc) => {
      syncLocalTracksToPeer(pc);
    });
  }, [localStream, syncLocalTracksToPeer]);

  // Initiate connection by creating and sending an offer
  const connectToPeer = useCallback(
    async (peerId: string) => {
      console.log(`Initiating connection (Offer) to peer: ${peerId}`);
      const pc = createConnectionForPeer(peerId);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendOffer(peerId, offer.sdp || "");
      } catch (err) {
        console.error(`Failed to create offer for peer ${peerId}:`, err);
      }
    },
    [createConnectionForPeer, sendOffer]
  );

  // Route incoming signaling messages
  const handleSignalingMessage = useCallback(
    async (msg: SignalingMessage) => {
      const peerId = msg.senderId;
      if (!peerId || peerId === currentUserId) return;

      switch (msg.type) {
        case "JOIN": {
          // A new user has joined the signaling room.
          // Deterministic tie-breaker: User with lexicographically smaller ID initiates.
          const isInitiator = shouldInitiateConnection(currentUserId, peerId);
          if (isInitiator && !peerConnectionsRef.current.has(peerId)) {
            connectToPeer(peerId);
          }
          break;
        }

        case "ROOM_STATE": {
          // Sent privately to the user upon joining, listing all existing active room participants.
          const list = msg.payload;
          if (Array.isArray(list)) {
            list.forEach((p: ParticipantDto) => {
              const remoteUserId = String(p.userId);
              if (remoteUserId === currentUserId) return;

              const isInitiator = shouldInitiateConnection(currentUserId, remoteUserId);
              if (isInitiator && !peerConnectionsRef.current.has(remoteUserId)) {
                connectToPeer(remoteUserId);
              }
            });
          }
          break;
        }

        case "OFFER": {
          const sdp = msg.payload?.sdp;
          if (!sdp) return;

          let pc = peerConnectionsRef.current.get(peerId);
          if (!pc) {
            pc = createConnectionForPeer(peerId);
          } else {
            syncLocalTracksToPeer(pc);
          }

          if (!iceQueueRef.current.has(peerId)) {
            iceQueueRef.current.set(peerId, []);
          }

          try {
            await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp }));

            // remote description successfully set; flush any buffered candidates
            const queue = iceQueueRef.current.get(peerId) || [];
            iceQueueRef.current.set(peerId, []);
            for (const candidate of queue) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (err) {
                console.error(`Failed to add buffered candidate for ${peerId}:`, err);
              }
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendAnswer(peerId, answer.sdp || "");
          } catch (err) {
            console.error(`Error processing OFFER from ${peerId}:`, err);
          }
          break;
        }

        case "ANSWER": {
          const sdp = msg.payload?.sdp;
          if (!sdp) return;

          const pc = peerConnectionsRef.current.get(peerId);
          if (!pc) return;

          if (!iceQueueRef.current.has(peerId)) {
            iceQueueRef.current.set(peerId, []);
          }

          try {
            await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp }));

            // remote description successfully set; flush any buffered candidates
            const queue = iceQueueRef.current.get(peerId) || [];
            iceQueueRef.current.set(peerId, []);
            for (const candidate of queue) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (err) {
                console.error(`Failed to add buffered candidate for ${peerId}:`, err);
              }
            }
          } catch (err) {
            console.error(`Error processing ANSWER from ${peerId}:`, err);
          }
          break;
        }

        case "ICE_CANDIDATE": {
          const candidate = msg.payload;
          if (!candidate) return;

          const pc = peerConnectionsRef.current.get(peerId);
          if (pc && pc.remoteDescription) {
            // If remote description is already applied, add candidate directly
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              console.error(`Error adding direct candidate for ${peerId}:`, err);
            }
          } else {
            // Otherwise, buffer the candidate to prevent premature addIceCandidate races
            if (!iceQueueRef.current.has(peerId)) {
              iceQueueRef.current.set(peerId, []);
            }
            iceQueueRef.current.get(peerId)!.push(candidate);
          }
          break;
        }

        case "LEAVE": {
          disconnectPeer(peerId);
          break;
        }

        default:
          break;
      }
    },
    [
      currentUserId,
      createConnectionForPeer,
      sendAnswer,
      disconnectPeer,
      connectToPeer,
      syncLocalTracksToPeer,
    ]
  );

  // Effect: Connect to existing room members upon joining
  useEffect(() => {
    if (!currentUserId) return;

    participants.forEach((p) => {
      const remoteUserId = String(p.userId);
      if (remoteUserId === currentUserId) return;

      const isInitiator = shouldInitiateConnection(currentUserId, remoteUserId);
      if (isInitiator && !peerConnectionsRef.current.has(remoteUserId)) {
        connectToPeer(remoteUserId);
      }
    });
  }, [currentUserId, participants, connectToPeer]);

  // Cleanup all connections when hook unmounts
  useEffect(() => {
    return () => {
      disconnectAll();
    };
  }, [disconnectAll]);

  return {
    peers,
    connectToPeer,
    disconnectPeer,
    disconnectAll,
    handleSignalingMessage,
  };
}
