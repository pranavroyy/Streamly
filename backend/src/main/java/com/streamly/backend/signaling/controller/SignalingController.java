package com.streamly.backend.signaling.controller;

import com.streamly.backend.signaling.dto.AnswerMessage;
import com.streamly.backend.signaling.dto.IceCandidateMessage;
import com.streamly.backend.signaling.dto.JoinMessage;
import com.streamly.backend.signaling.dto.LeaveMessage;
import com.streamly.backend.signaling.dto.OfferMessage;
import com.streamly.backend.signaling.dto.ParticipantDto;
import com.streamly.backend.signaling.dto.SignalingMessage;
import com.streamly.backend.signaling.enums.MessageType;
import com.streamly.backend.signaling.model.Participant;
import com.streamly.backend.signaling.service.SignalingRoomService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Controller handling STOMP WebSocket signaling messages for WebRTC peer-to-peer connection establishment.
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class SignalingController {

    private final SignalingRoomService roomService;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Handles room join requests.
     * Path: /app/join
     */
    @MessageMapping("/join")
    public void handleJoin(@Payload SignalingMessage<JoinMessage> message,
                           SimpMessageHeaderAccessor headerAccessor,
                           @Header(value = "simpSessionId", required = false) String headerSessionId) {

        String sessionId = headerAccessor != null ? headerAccessor.getSessionId() : headerSessionId;
        String roomId = message != null ? message.getRoomId() : null;
        String senderId = message != null ? message.getSenderId() : null;

        if (roomId == null || roomId.isBlank() || senderId == null || senderId.isBlank()) {
            log.warn("Malformed JOIN message received: {}", message);
            sendErrorToUser(senderId, sessionId, "Invalid room ID or sender ID for JOIN message.");
            return;
        }

        boolean joined = roomService.joinRoom(roomId, senderId, sessionId);
        if (!joined) {
            log.warn("Join failed or duplicate join for user {} in room {}", senderId, roomId);
            sendErrorToUser(senderId, sessionId, "Duplicate join or unable to join room " + roomId);
            return;
        }

        // 1. Broadcast JOIN event to all participants in the room
        SignalingMessage<JoinMessage> joinBroadcast = SignalingMessage.<JoinMessage>builder()
                .type(MessageType.JOIN)
                .roomId(roomId)
                .senderId(senderId)
                .payload(new JoinMessage(senderId))
                .build();

        messagingTemplate.convertAndSend("/topic/rooms/" + roomId, joinBroadcast);
        log.info("Broadcasted JOIN message for user {} in room {}", senderId, roomId);

        // 2. Send the newly joined user the current participant list via private destination
        Collection<Participant> participants = roomService.getParticipants(roomId);
        List<ParticipantDto> participantDtos = participants.stream()
                .map(p -> new ParticipantDto(p.getUserId(), p.getJoinedAt()))
                .collect(Collectors.toList());

        SignalingMessage<List<ParticipantDto>> roomStateMessage = SignalingMessage.<List<ParticipantDto>>builder()
                .type(MessageType.ROOM_STATE)
                .roomId(roomId)
                .senderId("SERVER")
                .targetId(senderId)
                .payload(participantDtos)
                .build();

        sendPrivateMessage(senderId, sessionId, roomStateMessage);
    }

    /**
     * Handles room leave requests.
     * Path: /app/leave
     */
    @MessageMapping("/leave")
    public void handleLeave(@Payload SignalingMessage<LeaveMessage> message,
                            SimpMessageHeaderAccessor headerAccessor,
                            @Header(value = "simpSessionId", required = false) String headerSessionId) {

        String roomId = message != null ? message.getRoomId() : null;
        String senderId = message != null ? message.getSenderId() : null;

        if (roomId == null || senderId == null) {
            log.warn("Malformed LEAVE message received: {}", message);
            return;
        }

        Optional<SignalingRoomService.ParticipantRemovalResult> resultOpt = roomService.leaveRoom(roomId, senderId);
        if (resultOpt.isPresent()) {
            SignalingMessage<LeaveMessage> leaveBroadcast = SignalingMessage.<LeaveMessage>builder()
                    .type(MessageType.LEAVE)
                    .roomId(roomId)
                    .senderId(senderId)
                    .payload(new LeaveMessage(senderId, "User requested leave"))
                    .build();

            messagingTemplate.convertAndSend("/topic/rooms/" + roomId, leaveBroadcast);
            log.info("Broadcasted LEAVE event for user {} in room {}", senderId, roomId);
        }
    }

    /**
     * Relays SDP offer to the specified target peer only.
     * Path: /app/offer
     */
    @MessageMapping("/offer")
    public void handleOffer(@Payload SignalingMessage<OfferMessage> message,
                            SimpMessageHeaderAccessor headerAccessor,
                            @Header(value = "simpSessionId", required = false) String headerSessionId) {

        if (!validateRelayMessage(message, MessageType.OFFER)) {
            return;
        }

        String roomId = message.getRoomId();
        String senderId = message.getSenderId();
        String targetId = message.getTargetId();

        Optional<Participant> targetParticipantOpt = roomService.getParticipant(roomId, targetId);
        if (targetParticipantOpt.isEmpty()) {
            log.warn("Target user {} not found in room {} for offer relay from {}", targetId, roomId, senderId);
            String sessionId = headerAccessor != null ? headerAccessor.getSessionId() : headerSessionId;
            sendErrorToUser(senderId, sessionId, "Target user " + targetId + " is not present in room " + roomId);
            return;
        }

        sendPrivateMessage(targetId, targetParticipantOpt.get().getSessionId(), message);
        log.info("Offer relayed from {} to {} in room {}", senderId, targetId, roomId);
    }

    /**
     * Relays SDP answer to the specified target peer only.
     * Path: /app/answer
     */
    @MessageMapping("/answer")
    public void handleAnswer(@Payload SignalingMessage<AnswerMessage> message,
                             SimpMessageHeaderAccessor headerAccessor,
                             @Header(value = "simpSessionId", required = false) String headerSessionId) {

        if (!validateRelayMessage(message, MessageType.ANSWER)) {
            return;
        }

        String roomId = message.getRoomId();
        String senderId = message.getSenderId();
        String targetId = message.getTargetId();

        Optional<Participant> targetParticipantOpt = roomService.getParticipant(roomId, targetId);
        if (targetParticipantOpt.isEmpty()) {
            log.warn("Target user {} not found in room {} for answer relay from {}", targetId, roomId, senderId);
            String sessionId = headerAccessor != null ? headerAccessor.getSessionId() : headerSessionId;
            sendErrorToUser(senderId, sessionId, "Target user " + targetId + " is not present in room " + roomId);
            return;
        }

        sendPrivateMessage(targetId, targetParticipantOpt.get().getSessionId(), message);
        log.info("Answer relayed from {} to {} in room {}", senderId, targetId, roomId);
    }

    /**
     * Relays ICE candidate to the specified target peer only.
     * Path: /app/ice
     */
    @MessageMapping("/ice")
    public void handleIceCandidate(@Payload SignalingMessage<IceCandidateMessage> message,
                                   SimpMessageHeaderAccessor headerAccessor,
                                   @Header(value = "simpSessionId", required = false) String headerSessionId) {

        if (!validateRelayMessage(message, MessageType.ICE_CANDIDATE)) {
            return;
        }

        String roomId = message.getRoomId();
        String senderId = message.getSenderId();
        String targetId = message.getTargetId();

        Optional<Participant> targetParticipantOpt = roomService.getParticipant(roomId, targetId);
        if (targetParticipantOpt.isEmpty()) {
            log.warn("Target user {} not found in room {} for ICE candidate relay from {}", targetId, roomId, senderId);
            String sessionId = headerAccessor != null ? headerAccessor.getSessionId() : headerSessionId;
            sendErrorToUser(senderId, sessionId, "Target user " + targetId + " is not present in room " + roomId);
            return;
        }

        sendPrivateMessage(targetId, targetParticipantOpt.get().getSessionId(), message);
        log.info("ICE candidate relayed from {} to {} in room {}", senderId, targetId, roomId);
    }

    /**
     * Validates required relay message parameters.
     */
    private boolean validateRelayMessage(SignalingMessage<?> message, MessageType expectedType) {
        if (message == null) {
            log.warn("Received null signaling message for type {}", expectedType);
            return false;
        }
        if (message.getRoomId() == null || message.getRoomId().isBlank()
                || message.getSenderId() == null || message.getSenderId().isBlank()
                || message.getTargetId() == null || message.getTargetId().isBlank()
                || message.getPayload() == null) {
            log.warn("Invalid {} signaling message parameters: {}", expectedType, message);
            return false;
        }
        return true;
    }

    /**
     * Sends a private message to a specific target user and session queue.
     */
    private void sendPrivateMessage(String userId, String sessionId, Object payload) {
        // Send to standard Spring user destination: /user/{userId}/queue/signaling
        messagingTemplate.convertAndSendToUser(userId, "/queue/signaling", payload);
    }

    /**
     * Sends an error signaling message to the client.
     */
    private void sendErrorToUser(String userId, String sessionId, String errorMessage) {
        SignalingMessage<String> errorMsg = SignalingMessage.<String>builder()
                .type(MessageType.ERROR)
                .senderId("SERVER")
                .targetId(userId)
                .payload(errorMessage)
                .build();

        if (userId != null && !userId.isBlank()) {
            messagingTemplate.convertAndSendToUser(userId, "/queue/signaling", errorMsg);
        }
    }
}
