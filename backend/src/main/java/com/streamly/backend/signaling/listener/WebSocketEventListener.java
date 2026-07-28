package com.streamly.backend.signaling.listener;

import com.streamly.backend.signaling.dto.LeaveMessage;
import com.streamly.backend.signaling.dto.SignalingMessage;
import com.streamly.backend.signaling.enums.MessageType;
import com.streamly.backend.signaling.service.SignalingRoomService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.Optional;

/**
 * Event listener for handling unexpected WebSocket session disconnects.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final SignalingRoomService roomService;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Handles Spring WebSocket SessionDisconnectEvent.
     *
     * @param event The SessionDisconnectEvent instance
     */
    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        String sessionId = event.getSessionId();
        log.info("WebSocket session disconnect detected: {}", sessionId);

        Optional<SignalingRoomService.ParticipantRemovalResult> resultOpt =
                roomService.removeParticipantBySessionId(sessionId);

        if (resultOpt.isPresent()) {
            SignalingRoomService.ParticipantRemovalResult result = resultOpt.get();
            String roomId = result.getRoomId();
            String userId = result.getUserId();

            log.info("Participant {} disconnected from room {}. Broadcasting LEAVE event.", userId, roomId);

            SignalingMessage<LeaveMessage> leaveBroadcast = SignalingMessage.<LeaveMessage>builder()
                    .type(MessageType.LEAVE)
                    .roomId(roomId)
                    .senderId(userId)
                    .payload(new LeaveMessage(userId, "Unexpected WebSocket disconnect"))
                    .build();

            messagingTemplate.convertAndSend("/topic/rooms/" + roomId, leaveBroadcast);

            if (result.isRoomDeleted()) {
                log.info("Room {} automatically cleaned up after last participant disconnected.", roomId);
            }
        }
    }
}
