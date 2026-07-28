package com.streamly.backend.signaling.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.ToString;

import java.time.Instant;

/**
 * Thread-safe domain model representing an active WebRTC room participant.
 */
@Getter
@ToString
@EqualsAndHashCode(of = {"userId", "sessionId"})
@AllArgsConstructor
@Builder
public class Participant {
    private final String userId;
    private final String sessionId;
    private final Instant joinedAt;

    public Participant(String userId, String sessionId) {
        this.userId = userId;
        this.sessionId = sessionId;
        this.joinedAt = Instant.now();
    }
}
