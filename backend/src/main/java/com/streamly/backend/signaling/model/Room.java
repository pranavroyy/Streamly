package com.streamly.backend.signaling.model;

import lombok.Getter;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Thread-safe domain model representing a WebRTC signaling room.
 */
public class Room {

    public enum JoinStatus {
        JOINED,
        REJOINED,
        DUPLICATE_REJECTED
    }

    @Getter
    private final String roomId;

    private final Map<String, Participant> participants = new ConcurrentHashMap<>();

    public Room(String roomId) {
        this.roomId = roomId;
    }

    /**
     * Adds a new participant or handles reconnection for an existing participant.
     *
     * @param userId    The user ID
     * @param sessionId The WebSocket session ID
     * @return JoinStatus result of join attempt
     */
    public JoinStatus addOrUpdateParticipant(String userId, String sessionId) {
        if (userId == null || userId.isBlank()) {
            return JoinStatus.DUPLICATE_REJECTED;
        }

        Participant existing = participants.get(userId);
        if (existing == null) {
            Participant newParticipant = new Participant(userId, sessionId);
            Participant prev = participants.putIfAbsent(userId, newParticipant);
            return prev == null ? JoinStatus.JOINED : JoinStatus.DUPLICATE_REJECTED;
        }

        // If user was marked DISCONNECTED (or is reconnecting with new session ID)
        if (existing.isDisconnected()) {
            existing.markActive(sessionId);
            return JoinStatus.REJOINED;
        }

        // If already active with the exact same session
        if (sessionId != null && sessionId.equals(existing.getSessionId())) {
            return JoinStatus.REJOINED;
        }

        // Active user with different session -> duplicate join attempt
        return JoinStatus.DUPLICATE_REJECTED;
    }

    /**
     * Removes a participant by userId.
     *
     * @param userId The ID of the user to remove
     * @return Optional containing the removed participant, if found
     */
    public Optional<Participant> removeParticipant(String userId) {
        if (userId == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(participants.remove(userId));
    }

    /**
     * Retrieves a participant by userId.
     *
     * @param userId The user ID
     * @return Optional containing the participant if present
     */
    public Optional<Participant> getParticipant(String userId) {
        if (userId == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(participants.get(userId));
    }

    /**
     * Gets a copy of all active participants in the room.
     *
     * @return Collection of participants
     */
    public Collection<Participant> getParticipants() {
        return Collections.unmodifiableCollection(new ArrayList<>(participants.values()));
    }

    /**
     * Checks if a user is currently in the room.
     *
     * @param userId User ID to check
     * @return true if present
     */
    public boolean containsParticipant(String userId) {
        return userId != null && participants.containsKey(userId);
    }

    /**
     * Checks if the room has no remaining active or pending participants.
     *
     * @return true if empty
     */
    public boolean isEmpty() {
        return participants.isEmpty();
    }

    /**
     * Returns the total count of participants in the room.
     *
     * @return participant count
     */
    public int getParticipantCount() {
        return participants.size();
    }
}
