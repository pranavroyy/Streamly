package com.streamly.backend.signaling.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Join event message payload.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JoinMessage {
    private String userId;
}
