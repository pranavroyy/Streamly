package com.streamly.backend.signaling.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.Instant;

/**
 * Thread-safe domain model representing a WebRTC room participant.
 */
@Getter
@ToString
@EqualsAndHashCode(of = {"userId"})
@AllArgsConstructor
@Builder
public class Participant {

    public enum ParticipantStatus {
        ACTIVE,
        DISCONNECTED
    }

    private final String userId;
    @Setter
    private String sessionId;
    private final Instant joinedAt;
    @Setter
    @Builder.Default
    private ParticipantStatus status = ParticipantStatus.ACTIVE;
    @Setter
    private Instant disconnectedAt;

    public Participant(String userId, String sessionId) {
        this.userId = userId;
        this.sessionId = sessionId;
        this.joinedAt = Instant.now();
        this.status = ParticipantStatus.ACTIVE;
    }

    public boolean isDisconnected() {
        return ParticipantStatus.DISCONNECTED.equals(status);
    }

    public void markActive(String newSessionId) {
        this.sessionId = newSessionId;
        this.status = ParticipantStatus.ACTIVE;
        this.disconnectedAt = null;
    }

    public void markDisconnected() {
        this.status = ParticipantStatus.DISCONNECTED;
        this.disconnectedAt = Instant.now();
    }
}
