package com.streamly.backend.room.dto;

import com.streamly.backend.room.entity.Room;
import com.streamly.backend.room.entity.RoomStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomResponse {

    private Long id;
    private String name;
    private Long ownerId;
    private String ownerName;
    private RoomStatus status;
    private LocalDateTime createdAt;
    private List<ParticipantResponse> participants;

    public static RoomResponse fromEntity(Room room) {
        if (room == null) return null;
        List<ParticipantResponse> participantResponses = room.getParticipants() != null
                ? room.getParticipants().stream().map(ParticipantResponse::fromEntity).collect(Collectors.toList())
                : Collections.emptyList();

        return RoomResponse.builder()
                .id(room.getId())
                .name(room.getName())
                .ownerId(room.getOwner() != null ? room.getOwner().getId() : null)
                .ownerName(room.getOwner() != null ? room.getOwner().getFullName() : null)
                .status(room.getStatus())
                .createdAt(room.getCreatedAt())
                .participants(participantResponses)
                .build();
    }
}
