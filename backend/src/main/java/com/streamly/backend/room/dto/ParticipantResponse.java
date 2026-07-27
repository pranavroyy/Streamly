package com.streamly.backend.room.dto;

import com.streamly.backend.room.entity.Participant;
import com.streamly.backend.room.entity.ParticipantRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ParticipantResponse {

    private Long id;
    private Long roomId;
    private Long userId;
    private String userEmail;
    private String userFullName;
    private ParticipantRole role;
    private LocalDateTime joinedAt;

    public static ParticipantResponse fromEntity(Participant participant) {
        if (participant == null) return null;
        return ParticipantResponse.builder()
                .id(participant.getId())
                .roomId(participant.getRoom() != null ? participant.getRoom().getId() : null)
                .userId(participant.getUser() != null ? participant.getUser().getId() : null)
                .userEmail(participant.getUser() != null ? participant.getUser().getEmail() : null)
                .userFullName(participant.getUser() != null ? participant.getUser().getFullName() : null)
                .role(participant.getRole())
                .joinedAt(participant.getJoinedAt())
                .build();
    }
}
