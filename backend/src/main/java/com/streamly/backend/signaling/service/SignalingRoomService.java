package com.streamly.backend.signaling.service;

import com.streamly.backend.signaling.model.Participant;
import com.streamly.backend.signaling.model.Room;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.Collections;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * In-memory thread-safe service responsible for WebRTC room lifecycle and participant management.
 */
@Slf4j
@Service
public class SignalingRoomService {

    private final ConcurrentMap<String, Room> rooms = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, SessionMapping> sessionRegistry = new ConcurrentHashMap<>();

    /**
     * Internal container for session mapping details.
     */
    @Getter
    @AllArgsConstructor
    public static class SessionMapping {
        private final String userId;
        private final String roomId;
    }

    /**
     * Container holding removal details when a participant leaves or disconnects.
     */
    @Getter
    @AllArgsConstructor
    public static class ParticipantRemovalResult {
        private final String roomId;
        private final String userId;
        private final Participant participant;
        private final boolean roomDeleted;
    }

    /**
     * Creates a new room if it does not already exist.
     *
     * @param roomId The room identifier
     * @return The created or existing Room instance
     */
    public Room createRoom(String roomId) {
        return rooms.computeIfAbsent(roomId, id -> {
            log.info("Creating room: {}", id);
            return new Room(id);
        });
    }

    /**
     * Joins a user to a room. Prevents duplicate joins for the same userId.
     *
     * @param roomId    The room ID
     * @param userId    The participant's user ID
     * @param sessionId The WebSocket session ID
     * @return true if successfully joined, false if duplicate join
     */
    public boolean joinRoom(String roomId, String userId, String sessionId) {
        if (roomId == null || roomId.isBlank() || userId == null || userId.isBlank()) {
            log.warn("Invalid join request. roomId: {}, userId: {}", roomId, userId);
            return false;
        }

        Room room = createRoom(roomId);
        Participant participant = new Participant(userId, sessionId);

        boolean added = room.addParticipant(participant);
        if (!added) {
            log.warn("Duplicate join attempt rejected for user {} in room {}", userId, roomId);
            return false;
        }

        if (sessionId != null) {
            sessionRegistry.put(sessionId, new SessionMapping(userId, roomId));
        }

        log.info("User {} joined room {} (sessionId: {})", userId, roomId, sessionId);
        return true;
    }

    /**
     * Removes a participant from a room by user ID.
     *
     * @param roomId The room ID
     * @param userId The user ID to remove
     * @return ParticipantRemovalResult optional containing details
     */
    public Optional<ParticipantRemovalResult> leaveRoom(String roomId, String userId) {
        if (roomId == null || userId == null) {
            return Optional.empty();
        }

        Room room = rooms.get(roomId);
        if (room == null) {
            log.warn("Leave room requested for non-existent room {}", roomId);
            return Optional.empty();
        }

        Optional<Participant> removedParticipantOpt = room.removeParticipant(userId);
        if (removedParticipantOpt.isEmpty()) {
            log.warn("User {} not found in room {} during leave operation", userId, roomId);
            return Optional.empty();
        }

        Participant participant = removedParticipantOpt.get();
        if (participant.getSessionId() != null) {
            sessionRegistry.remove(participant.getSessionId());
        }

        log.info("User {} left room {}", userId, roomId);

        boolean roomDeleted = deleteRoomIfEmpty(roomId);

        return Optional.of(new ParticipantRemovalResult(roomId, userId, participant, roomDeleted));
    }

    /**
     * Removes a participant by WebSocket session ID (for disconnect handling).
     *
     * @param sessionId WebSocket session ID
     * @return ParticipantRemovalResult optional
     */
    public Optional<ParticipantRemovalResult> removeParticipantBySessionId(String sessionId) {
        if (sessionId == null) {
            return Optional.empty();
        }

        SessionMapping mapping = sessionRegistry.remove(sessionId);
        if (mapping == null) {
            log.debug("No session mapping found for disconnected session {}", sessionId);
            return Optional.empty();
        }

        log.info("Handling disconnect for session {} (User: {}, Room: {})",
                sessionId, mapping.getUserId(), mapping.getRoomId());

        return leaveRoom(mapping.getRoomId(), mapping.getUserId());
    }

    /**
     * Retrieves all active participants in a room.
     *
     * @param roomId Room ID
     * @return Collection of participants or empty collection if room does not exist
     */
    public Collection<Participant> getParticipants(String roomId) {
        Room room = rooms.get(roomId);
        if (room == null) {
            return Collections.emptyList();
        }
        return room.getParticipants();
    }

    /**
     * Retrieves a single participant from a room.
     *
     * @param roomId Room ID
     * @param userId User ID
     * @return Optional participant
     */
    public Optional<Participant> getParticipant(String roomId, String userId) {
        Room room = rooms.get(roomId);
        if (room == null) {
            return Optional.empty();
        }
        return room.getParticipant(userId);
    }

    /**
     * Checks if a room currently exists in memory.
     *
     * @param roomId Room ID
     * @return true if room exists
     */
    public boolean roomExists(String roomId) {
        return roomId != null && rooms.containsKey(roomId);
    }

    /**
     * Automatically deletes a room if it contains no remaining participants.
     *
     * @param roomId Room ID
     * @return true if room was deleted, false otherwise
     */
    public boolean deleteRoomIfEmpty(String roomId) {
        if (roomId == null) {
            return false;
        }

        Room room = rooms.get(roomId);
        if (room != null && room.isEmpty()) {
            boolean removed = rooms.remove(roomId, room);
            if (removed) {
                log.info("Room deleted (empty): {}", roomId);
                return true;
            }
        }
        return false;
    }
}
