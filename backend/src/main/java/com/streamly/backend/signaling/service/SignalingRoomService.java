package com.streamly.backend.signaling.service;

import com.streamly.backend.signaling.model.Participant;
import com.streamly.backend.signaling.model.Room;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.Collections;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

/**
 * In-memory thread-safe service responsible for WebRTC room lifecycle, participant management,
 * and reconnect grace period handling.
 */
@Slf4j
@Service
public class SignalingRoomService {

    @Getter
    @Setter
    @Value("${websocket.reconnect.grace-period-ms:5000}")
    private long gracePeriodMs = 5000;

    private final ConcurrentMap<String, Room> rooms = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, SessionMapping> sessionRegistry = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, ScheduledFuture<?>> gracePeriodTasks = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();

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
     * Joins a user to a room. Supports reconnection within the grace period.
     *
     * @param roomId    The room ID
     * @param userId    The participant's user ID
     * @param sessionId The WebSocket session ID
     * @return Room.JoinStatus (JOINED, REJOINED, or DUPLICATE_REJECTED)
     */
    public Room.JoinStatus joinRoom(String roomId, String userId, String sessionId) {
        if (roomId == null || roomId.isBlank() || userId == null || userId.isBlank()) {
            log.warn("Invalid join request. roomId: {}, userId: {}", roomId, userId);
            return Room.JoinStatus.DUPLICATE_REJECTED;
        }

        // Cancel any pending grace period disconnect task for this user
        cancelGracePeriodTask(userId);

        Room room = createRoom(roomId);
        Room.JoinStatus status = room.addOrUpdateParticipant(userId, sessionId);

        if (status == Room.JoinStatus.DUPLICATE_REJECTED) {
            log.warn("Duplicate join attempt rejected for user {} in room {}", userId, roomId);
            return Room.JoinStatus.DUPLICATE_REJECTED;
        }

        if (sessionId != null) {
            sessionRegistry.put(sessionId, new SessionMapping(userId, roomId));
        }

        if (status == Room.JoinStatus.REJOINED) {
            log.info("User {} REJOINED room {} (sessionId: {}) within grace period", userId, roomId, sessionId);
        } else {
            log.info("User {} JOINED room {} (sessionId: {})", userId, roomId, sessionId);
        }

        return status;
    }

    /**
     * Explicitly removes a participant from a room by user ID (bypasses grace period).
     *
     * @param roomId The room ID
     * @param userId The user ID to remove
     * @return ParticipantRemovalResult optional containing details
     */
    public Optional<ParticipantRemovalResult> leaveRoom(String roomId, String userId) {
        if (roomId == null || userId == null) {
            return Optional.empty();
        }

        // Cancel pending grace period disconnect task if any
        cancelGracePeriodTask(userId);

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
     * Handles unexpected WebSocket session disconnects with grace period support.
     *
     * @param sessionId              WebSocket session ID
     * @param onExpiredRemovalCallback Consumer callback invoked if grace period expires without reconnect
     * @return Optional containing the session mapping if found
     */
    public Optional<SessionMapping> handleSessionDisconnect(String sessionId,
                                                             Consumer<ParticipantRemovalResult> onExpiredRemovalCallback) {
        if (sessionId == null) {
            return Optional.empty();
        }

        SessionMapping mapping = sessionRegistry.remove(sessionId);
        if (mapping == null) {
            log.debug("No session mapping found for disconnected session {}", sessionId);
            return Optional.empty();
        }

        String roomId = mapping.getRoomId();
        String userId = mapping.getUserId();

        Room room = rooms.get(roomId);
        if (room == null) {
            return Optional.empty();
        }

        Optional<Participant> participantOpt = room.getParticipant(userId);
        if (participantOpt.isEmpty()) {
            return Optional.empty();
        }

        Participant participant = participantOpt.get();
        participant.markDisconnected();

        log.info("Session disconnected for user {} in room {}. Starting {} ms grace period timer.",
                userId, roomId, gracePeriodMs);

        if (gracePeriodMs <= 0) {
            // Immediate cleanup if grace period is disabled or 0
            Optional<ParticipantRemovalResult> removalOpt = leaveRoom(roomId, userId);
            removalOpt.ifPresent(onExpiredRemovalCallback);
        } else {
            // Schedule grace period expiration task
            ScheduledFuture<?> task = scheduler.schedule(() -> {
                gracePeriodTasks.remove(userId);
                if (participant.isDisconnected()) {
                    log.info("Grace period expired for user {} in room {}. Executing removal.", userId, roomId);
                    Optional<ParticipantRemovalResult> removalOpt = leaveRoom(roomId, userId);
                    if (removalOpt.isPresent() && onExpiredRemovalCallback != null) {
                        onExpiredRemovalCallback.accept(removalOpt.get());
                    }
                }
            }, gracePeriodMs, TimeUnit.MILLISECONDS);

            gracePeriodTasks.put(userId, task);
        }

        return Optional.of(mapping);
    }

    /**
     * Removes a participant immediately by session ID.
     */
    public Optional<ParticipantRemovalResult> removeParticipantBySessionId(String sessionId) {
        if (sessionId == null) {
            return Optional.empty();
        }

        SessionMapping mapping = sessionRegistry.remove(sessionId);
        if (mapping == null) {
            return Optional.empty();
        }

        return leaveRoom(mapping.getRoomId(), mapping.getUserId());
    }

    /**
     * Cancels any pending grace period task for a given user.
     */
    private void cancelGracePeriodTask(String userId) {
        if (userId != null) {
            ScheduledFuture<?> task = gracePeriodTasks.remove(userId);
            if (task != null && !task.isDone()) {
                task.cancel(false);
                log.debug("Cancelled pending grace period timer for user {}", userId);
            }
        }
    }

    /**
     * Retrieves all active/present participants in a room.
     *
     * @param roomId Room ID
     * @return Collection of participants
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
