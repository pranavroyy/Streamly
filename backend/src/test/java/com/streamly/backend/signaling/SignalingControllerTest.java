package com.streamly.backend.signaling;

import com.streamly.backend.signaling.controller.SignalingController;
import com.streamly.backend.signaling.dto.AnswerMessage;
import com.streamly.backend.signaling.dto.IceCandidateMessage;
import com.streamly.backend.signaling.dto.JoinMessage;
import com.streamly.backend.signaling.dto.OfferMessage;
import com.streamly.backend.signaling.dto.SignalingMessage;
import com.streamly.backend.signaling.enums.MessageType;
import com.streamly.backend.signaling.service.SignalingRoomService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class SignalingControllerTest {

    private SignalingRoomService roomService;
    private SimpMessagingTemplate messagingTemplate;
    private SignalingController controller;

    @BeforeEach
    void setUp() {
        roomService = new SignalingRoomService();
        messagingTemplate = mock(SimpMessagingTemplate.class);
        controller = new SignalingController(roomService, messagingTemplate);
    }

    @Test
    @DisplayName("Should broadcast JOIN to topic and send room state to joined user")
    void testHandleJoin() {
        SimpMessageHeaderAccessor headerAccessor = mock(SimpMessageHeaderAccessor.class);
        when(headerAccessor.getSessionId()).thenReturn("session-A");

        SignalingMessage<JoinMessage> joinMessage = SignalingMessage.<JoinMessage>builder()
                .type(MessageType.JOIN)
                .roomId("room-1")
                .senderId("user-A")
                .payload(new JoinMessage("user-A"))
                .build();

        controller.handleJoin(joinMessage, headerAccessor, "session-A");

        // Verify broadcast to topic
        verify(messagingTemplate).convertAndSend(eq("/topic/rooms/room-1"), any(SignalingMessage.class));

        // Verify private message to joined user
        verify(messagingTemplate).convertAndSendToUser(eq("user-A"), eq("/queue/signaling"), any());
    }

    @Test
    @DisplayName("Should relay SDP offer strictly to target peer")
    void testHandleOffer() {
        roomService.joinRoom("room-1", "user-A", "session-A");
        roomService.joinRoom("room-1", "user-B", "session-B");

        SignalingMessage<OfferMessage> offerMessage = SignalingMessage.<OfferMessage>builder()
                .type(MessageType.OFFER)
                .roomId("room-1")
                .senderId("user-A")
                .targetId("user-B")
                .payload(new OfferMessage("v=0...sdp-offer-data"))
                .build();

        SimpMessageHeaderAccessor headerAccessor = mock(SimpMessageHeaderAccessor.class);
        when(headerAccessor.getSessionId()).thenReturn("session-A");

        controller.handleOffer(offerMessage, headerAccessor, "session-A");

        // Verify offer sent strictly to target user-B
        ArgumentCaptor<Object> payloadCaptor = ArgumentCaptor.forClass(Object.class);
        verify(messagingTemplate).convertAndSendToUser(eq("user-B"), eq("/queue/signaling"), payloadCaptor.capture());
        verify(messagingTemplate, never()).convertAndSend(eq("/topic/rooms/room-1"), any(Object.class));

        SignalingMessage<?> sentMessage = (SignalingMessage<?>) payloadCaptor.getValue();
        assertEquals(MessageType.OFFER, sentMessage.getType());
        assertEquals("user-A", sentMessage.getSenderId());
        assertEquals("user-B", sentMessage.getTargetId());
    }

    @Test
    @DisplayName("Should relay SDP answer strictly to target peer")
    void testHandleAnswer() {
        roomService.joinRoom("room-1", "user-A", "session-A");
        roomService.joinRoom("room-1", "user-B", "session-B");

        SignalingMessage<AnswerMessage> answerMessage = SignalingMessage.<AnswerMessage>builder()
                .type(MessageType.ANSWER)
                .roomId("room-1")
                .senderId("user-B")
                .targetId("user-A")
                .payload(new AnswerMessage("v=0...sdp-answer-data"))
                .build();

        SimpMessageHeaderAccessor headerAccessor = mock(SimpMessageHeaderAccessor.class);
        when(headerAccessor.getSessionId()).thenReturn("session-B");

        controller.handleAnswer(answerMessage, headerAccessor, "session-B");

        verify(messagingTemplate).convertAndSendToUser(eq("user-A"), eq("/queue/signaling"), eq(answerMessage));
        verify(messagingTemplate, never()).convertAndSend(eq("/topic/rooms/room-1"), any(Object.class));
    }

    @Test
    @DisplayName("Should relay ICE candidate strictly to target peer")
    void testHandleIceCandidate() {
        roomService.joinRoom("room-1", "user-A", "session-A");
        roomService.joinRoom("room-1", "user-B", "session-B");

        SignalingMessage<IceCandidateMessage> iceMessage = SignalingMessage.<IceCandidateMessage>builder()
                .type(MessageType.ICE_CANDIDATE)
                .roomId("room-1")
                .senderId("user-A")
                .targetId("user-B")
                .payload(new IceCandidateMessage("candidate:123...", "audio", 0))
                .build();

        SimpMessageHeaderAccessor headerAccessor = mock(SimpMessageHeaderAccessor.class);
        when(headerAccessor.getSessionId()).thenReturn("session-A");

        controller.handleIceCandidate(iceMessage, headerAccessor, "session-A");

        verify(messagingTemplate).convertAndSendToUser(eq("user-B"), eq("/queue/signaling"), eq(iceMessage));
        verify(messagingTemplate, never()).convertAndSend(eq("/topic/rooms/room-1"), any(Object.class));
    }
}
