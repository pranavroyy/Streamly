package com.streamly.backend.signaling.enums;

/**
 * Enumeration of supported WebRTC signaling message types.
 */
public enum MessageType {
    JOIN,
    LEAVE,
    OFFER,
    ANSWER,
    ICE_CANDIDATE,
    ROOM_STATE,
    ERROR
}
