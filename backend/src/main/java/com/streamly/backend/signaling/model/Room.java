package com.streamly.backend.signaling.model;

import lombok.Getter;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Thread-safe domain model representing a WebRTC signaling room.
 */
public class Room {

    @Getter
    private final String roomId;

    private final Map<String, Participant> participants = new ConcurrentHashMap<>();

    public Room(String roomId) {
        this.roomId = roomId;
    }

    /**
     * Adds a participant to the room if not already present.
     *
     * @param participant The participant to add
     * @return true if added, false if participant with same userId already exists
     */
    public boolean addParticipant(Participant participant) {
        if (participant == null || participant.getUserId() == null) {
            return false;
        }
        return participants.putIfAbsent(participant.getUserId(), participant) == null;
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
     * Checks if the room has no remaining participants.
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
