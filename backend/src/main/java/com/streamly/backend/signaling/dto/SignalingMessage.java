package com.streamly.backend.signaling.dto;

import com.streamly.backend.signaling.enums.MessageType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Standard data transfer object for WebRTC signaling messages.
 *
 * @param <T> Payload type
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SignalingMessage<T> {

    private MessageType type;
    private String roomId;
    private String senderId;
    private String targetId;
    private T payload;
}
