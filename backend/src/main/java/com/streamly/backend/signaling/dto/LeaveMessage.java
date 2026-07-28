package com.streamly.backend.signaling.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Leave event message payload.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaveMessage {
    private String userId;
    private String reason;
}
