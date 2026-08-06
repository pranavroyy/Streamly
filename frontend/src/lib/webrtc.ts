const stunUrlsEnv = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_STUN_URLS : undefined;
const stunUrls = stunUrlsEnv
  ? stunUrlsEnv.split(",").map((url) => url.trim())
  : ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"];

export const ICE_SERVERS: RTCIceServer[] = [
  {
    urls: stunUrls,
  },
];

export function createPeerConnection(): RTCPeerConnection {
  return new RTCPeerConnection({
    iceServers: ICE_SERVERS,
  });
}

/**
 * Deterministic tie-breaker selection for WebRTC glare avoidance.
 * Returns true if the local user ID is lexicographically smaller than the remote user ID.
 */
export function shouldInitiateConnection(localId: string, remoteId: string): boolean {
  if (localId === remoteId) return false;
  return localId.localeCompare(remoteId) < 0;
}
