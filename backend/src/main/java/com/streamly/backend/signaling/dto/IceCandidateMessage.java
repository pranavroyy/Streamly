package com.streamly.backend.signaling.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * ICE Candidate payload schema.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IceCandidateMessage {
    private String candidate;
    private String sdpMid;
    private Integer sdpMLineIndex;
}
