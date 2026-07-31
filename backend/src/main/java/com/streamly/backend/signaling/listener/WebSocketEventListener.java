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

/**
 * Event listener for handling unexpected WebSocket session disconnects with grace period support.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final SignalingRoomService roomService;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Handles Spring WebSocket SessionDisconnectEvent.
     * Starts reconnect grace period timer before broadcasting LEAVE event.
     *
     * @param event The SessionDisconnectEvent instance
     */
    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        String sessionId = event.getSessionId();
        log.info("WebSocket session disconnect detected: {}", sessionId);

        roomService.handleSessionDisconnect(sessionId, removalResult -> {
            String roomId = removalResult.getRoomId();
            String userId = removalResult.getUserId();

            log.info("Grace period expired for participant {} in room {}. Broadcasting LEAVE event.", userId, roomId);

            SignalingMessage<LeaveMessage> leaveBroadcast = SignalingMessage.<LeaveMessage>builder()
                    .type(MessageType.LEAVE)
                    .roomId(roomId)
                    .senderId(userId)
                    .payload(new LeaveMessage(userId, "Session disconnect grace period expired"))
                    .build();

            messagingTemplate.convertAndSend("/topic/rooms/" + roomId, leaveBroadcast);

            if (removalResult.isRoomDeleted()) {
                log.info("Room {} automatically cleaned up after last participant left.", roomId);
            }
        });
    }
}
