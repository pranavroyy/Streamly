package com.streamly.backend.signaling.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * SDP Offer payload schema.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OfferMessage {
    private String sdp;
}
