export type SignalingStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'ERROR';

export type SignalingMessageType = 
  | 'JOIN' 
  | 'LEAVE' 
  | 'OFFER' 
  | 'ANSWER' 
  | 'ICE_CANDIDATE' 
  | 'ROOM_STATE' 
  | 'START_RECORDING'
  | 'STOP_RECORDING'
  | 'ERROR';

export interface SignalingMessage<T = any> {
  type: SignalingMessageType;
  roomId?: string;
  senderId?: string;
  targetId?: string;
  payload?: T;
}

export interface ParticipantDto {
  userId: string;
  joinedAt: string;
}

export interface JoinPayload {
  userId: string;
}

export interface LeavePayload {
  userId: string;
  reason?: string;
}

export interface OfferPayload {
  sdp: string;
}

export interface AnswerPayload {
  sdp: string;
}

export interface IceCandidatePayload {
  candidate: string;
  sdpMid?: string;
  sdpMLineIndex?: number;
}

export interface SignalingLogEntry {
  id: string;
  timestamp: string;
  type: SignalingMessageType | 'RECONNECT' | 'SYSTEM';
  direction: 'in' | 'out' | 'system';
  summary: string;
  details?: any;
}
