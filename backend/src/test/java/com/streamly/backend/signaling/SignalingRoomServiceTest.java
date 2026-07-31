package com.streamly.backend.signaling;

import com.streamly.backend.signaling.model.Participant;
import com.streamly.backend.signaling.model.Room;
import com.streamly.backend.signaling.service.SignalingRoomService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Collection;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class SignalingRoomServiceTest {

    private SignalingRoomService roomService;

    @BeforeEach
    void setUp() {
        roomService = new SignalingRoomService();
    }

    @Test
    @DisplayName("Should successfully join a user to a room")
    void testJoinRoomSuccess() {
        Room.JoinStatus status = roomService.joinRoom("room-1", "user-A", "session-A");
        assertEquals(Room.JoinStatus.JOINED, status, "User A should successfully join room-1");

        assertTrue(roomService.roomExists("room-1"));
        Collection<Participant> participants = roomService.getParticipants("room-1");
        assertEquals(1, participants.size());

        Optional<Participant> participantOpt = roomService.getParticipant("room-1", "user-A");
        assertTrue(participantOpt.isPresent());
        assertEquals("user-A", participantOpt.get().getUserId());
        assertEquals("session-A", participantOpt.get().getSessionId());
    }

    @Test
    @DisplayName("Should prevent duplicate joins for active user with different session ID")
    void testPreventDuplicateJoin() {
        Room.JoinStatus firstJoin = roomService.joinRoom("room-1", "user-A", "session-A");
        assertEquals(Room.JoinStatus.JOINED, firstJoin);

        Room.JoinStatus secondJoin = roomService.joinRoom("room-1", "user-A", "session-A2");
        assertEquals(Room.JoinStatus.DUPLICATE_REJECTED, secondJoin, "Duplicate join attempt for user-A should be rejected");

        Collection<Participant> participants = roomService.getParticipants("room-1");
        assertEquals(1, participants.size());
    }

    @Test
    @DisplayName("Should handle multiple users joining the same room")
    void testMultipleUsersJoin() {
        roomService.joinRoom("room-1", "user-A", "session-A");
        roomService.joinRoom("room-1", "user-B", "session-B");

        Collection<Participant> participants = roomService.getParticipants("room-1");
        assertEquals(2, participants.size());
    }

    @Test
    @DisplayName("Should remove user on leave and delete room when empty")
    void testLeaveRoomAndAutoDelete() {
        roomService.joinRoom("room-1", "user-A", "session-A");
        roomService.joinRoom("room-1", "user-B", "session-B");

        Optional<SignalingRoomService.ParticipantRemovalResult> userALeave =
                roomService.leaveRoom("room-1", "user-A");

        assertTrue(userALeave.isPresent());
        assertFalse(userALeave.get().isRoomDeleted());
        assertEquals(1, roomService.getParticipants("room-1").size());

        Optional<SignalingRoomService.ParticipantRemovalResult> userBLeave =
                roomService.leaveRoom("room-1", "user-B");

        assertTrue(userBLeave.isPresent());
        assertTrue(userBLeave.get().isRoomDeleted(), "Room should be deleted after last user leaves");
        assertFalse(roomService.roomExists("room-1"));
    }

    @Test
    @DisplayName("Should clean up participant and empty room on session disconnect")
    void testRemoveBySessionId() {
        roomService.joinRoom("room-1", "user-A", "session-A");

        Optional<SignalingRoomService.ParticipantRemovalResult> result =
                roomService.removeParticipantBySessionId("session-A");

        assertTrue(result.isPresent());
        assertEquals("user-A", result.get().getUserId());
        assertEquals("room-1", result.get().getRoomId());
        assertTrue(result.get().isRoomDeleted());
        assertFalse(roomService.roomExists("room-1"));
    }
}
