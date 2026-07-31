package com.streamly.backend.signaling;

import com.streamly.backend.signaling.controller.SignalingController;
import com.streamly.backend.signaling.dto.AnswerMessage;
import com.streamly.backend.signaling.dto.IceCandidateMessage;
import com.streamly.backend.signaling.dto.JoinMessage;
import com.streamly.backend.signaling.dto.OfferMessage;
import com.streamly.backend.signaling.dto.ParticipantDto;
import com.streamly.backend.signaling.dto.SignalingMessage;
import com.streamly.backend.signaling.enums.MessageType;
import com.streamly.backend.signaling.listener.WebSocketEventListener;
import com.streamly.backend.signaling.model.Room;
import com.streamly.backend.signaling.service.SignalingRoomService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Integration & scenario testing suite verifying Section 4.3 Backend Testing requirements.
 */
class SignalingIntegrationTest {

    private SignalingRoomService roomService;
    private SimpMessagingTemplate messagingTemplate;
    private SignalingController controller;
    private WebSocketEventListener disconnectListener;

    @BeforeEach
    void setUp() {
        roomService = new SignalingRoomService();
        messagingTemplate = mock(SimpMessagingTemplate.class);
        controller = new SignalingController(roomService, messagingTemplate);
        disconnectListener = new WebSocketEventListener(roomService, messagingTemplate);
    }

    @Test
    @DisplayName("4.3.1: Two WS clients join same room — both get peer-joined notification")
    void testTwoClientsJoinSameRoom_BothGetPeerJoined() {
        // User A joins room-1
        SimpMessageHeaderAccessor headerA = mock(SimpMessageHeaderAccessor.class);
        when(headerA.getSessionId()).thenReturn("session-A");

        SignalingMessage<JoinMessage> joinA = SignalingMessage.<JoinMessage>builder()
                .type(MessageType.JOIN)
                .roomId("room-1")
                .senderId("user-A")
                .payload(new JoinMessage("user-A"))
                .build();

        controller.handleJoin(joinA, headerA, "session-A");

        // Verify User A broadcast to topic and room state delivery
        verify(messagingTemplate).convertAndSend(eq("/topic/rooms/room-1"), any(SignalingMessage.class));
        verify(messagingTemplate).convertAndSendToUser(eq("user-A"), eq("/queue/signaling"), any());

        // User B joins room-1
        SimpMessageHeaderAccessor headerB = mock(SimpMessageHeaderAccessor.class);
        when(headerB.getSessionId()).thenReturn("session-B");

        SignalingMessage<JoinMessage> joinB = SignalingMessage.<JoinMessage>builder()
                .type(MessageType.JOIN)
                .roomId("room-1")
                .senderId("user-B")
                .payload(new JoinMessage("user-B"))
                .build();

        controller.handleJoin(joinB, headerB, "session-B");

        // Verify JOIN broadcast on /topic/rooms/room-1 when User B joins (notifying User A)
        verify(messagingTemplate, times(2)).convertAndSend(eq("/topic/rooms/room-1"), any(SignalingMessage.class));

        // Verify User B receives full participant list containing both users
        ArgumentCaptor<Object> payloadCaptor = ArgumentCaptor.forClass(Object.class);
        verify(messagingTemplate).convertAndSendToUser(eq("user-B"), eq("/queue/signaling"), payloadCaptor.capture());

        SignalingMessage<?> roomStateMsg = (SignalingMessage<?>) payloadCaptor.getValue();
        assertEquals(MessageType.ROOM_STATE, roomStateMsg.getType());
        @SuppressWarnings("unchecked")
        List<ParticipantDto> participants = (List<ParticipantDto>) roomStateMsg.getPayload();
        assertEquals(2, participants.size());
    }

    @Test
    @DisplayName("4.3.2: Room isolation test — signals in room-1 do not leak to room-2")
    void testRoomIsolation() {
        // User A joins room-1
        roomService.joinRoom("room-1", "user-A", "session-A");
        // User C joins room-2
        roomService.joinRoom("room-2", "user-C", "session-C");

        // User A attempts to offer to User C in room-1 (where User C is NOT present)
        SignalingMessage<OfferMessage> crossRoomOffer = SignalingMessage.<OfferMessage>builder()
                .type(MessageType.OFFER)
                .roomId("room-1")
                .senderId("user-A")
                .targetId("user-C")
                .payload(new OfferMessage("sdp-offer-data"))
                .build();

        SimpMessageHeaderAccessor headerA = mock(SimpMessageHeaderAccessor.class);
        when(headerA.getSessionId()).thenReturn("session-A");

        controller.handleOffer(crossRoomOffer, headerA, "session-A");

        // Verify offer is NOT delivered to user-C because user-C is isolated in room-2
        verify(messagingTemplate, never()).convertAndSendToUser(eq("user-C"), eq("/queue/signaling"), any());
        // Verify topic for room-2 is never sent messages from room-1
        verify(messagingTemplate, never()).convertAndSend(eq("/topic/rooms/room-2"), any(Object.class));
    }

    @Test
    @DisplayName("4.3.3: Disconnect → peer-left event broadcast after disconnect")
    void testDisconnectTriggersPeerLeft() {
        roomService.setGracePeriodMs(0); // Set 0 ms for immediate disconnect processing

        roomService.joinRoom("room-1", "user-A", "session-A");
        roomService.joinRoom("room-1", "user-B", "session-B");

        SessionDisconnectEvent disconnectEventB = mock(SessionDisconnectEvent.class);
        when(disconnectEventB.getSessionId()).thenReturn("session-B");

        // Trigger session disconnect for User B
        disconnectListener.handleWebSocketDisconnectListener(disconnectEventB);

        // Verify LEAVE event is broadcast to /topic/rooms/room-1 for remaining User A
        ArgumentCaptor<Object> broadcastCaptor = ArgumentCaptor.forClass(Object.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/rooms/room-1"), broadcastCaptor.capture());

        SignalingMessage<?> leaveMsg = (SignalingMessage<?>) broadcastCaptor.getValue();
        assertEquals(MessageType.LEAVE, leaveMsg.getType());
        assertEquals("user-B", leaveMsg.getSenderId());

        assertEquals(1, roomService.getParticipants("room-1").size());
    }

    @Test
    @DisplayName("4.3.4: Reconnect within grace period → rejoin state restored")
    void testReconnectWithinGracePeriod_RestoresRejoinState() {
        roomService.setGracePeriodMs(5000); // 5 second grace period

        // User B joins room-1
        roomService.joinRoom("room-1", "user-B", "session-B-1");

        // User B drops connection unexpectedly
        SessionDisconnectEvent disconnectEventB = mock(SessionDisconnectEvent.class);
        when(disconnectEventB.getSessionId()).thenReturn("session-B-1");

        disconnectListener.handleWebSocketDisconnectListener(disconnectEventB);

        // User B is in disconnected status during grace period
        assertTrue(roomService.getParticipant("room-1", "user-B").isPresent());
        assertTrue(roomService.getParticipant("room-1", "user-B").get().isDisconnected());

        // User B reconnects with new session ID before grace period expires
        Room.JoinStatus rejoinStatus = roomService.joinRoom("room-1", "user-B", "session-B-2");

        // Assert rejoin status and state restoration
        assertEquals(Room.JoinStatus.REJOINED, rejoinStatus);
        assertTrue(roomService.getParticipant("room-1", "user-B").isPresent());
        assertFalse(roomService.getParticipant("room-1", "user-B").get().isDisconnected());
        assertEquals("session-B-2", roomService.getParticipant("room-1", "user-B").get().getSessionId());

        // Verify LEAVE event was NOT broadcast because user reconnected within grace period
        verify(messagingTemplate, never()).convertAndSend(eq("/topic/rooms/room-1"), any(Object.class));
    }
}
