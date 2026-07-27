package com.streamly.backend.room.service;

import com.streamly.backend.exception.BadRequestException;
import com.streamly.backend.exception.ConflictException;
import com.streamly.backend.exception.ResourceNotFoundException;
import com.streamly.backend.room.dto.CreateRoomRequest;
import com.streamly.backend.room.dto.ParticipantResponse;
import com.streamly.backend.room.dto.RoomResponse;
import com.streamly.backend.room.entity.Participant;
import com.streamly.backend.room.entity.ParticipantRole;
import com.streamly.backend.room.entity.Room;
import com.streamly.backend.room.entity.RoomStatus;
import com.streamly.backend.room.repository.ParticipantRepository;
import com.streamly.backend.room.repository.RoomRepository;
import com.streamly.backend.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RoomServiceTest {

    @Mock
    private RoomRepository roomRepository;

    @Mock
    private ParticipantRepository participantRepository;

    @InjectMocks
    private RoomService roomService;

    private User owner;
    private User guest;
    private Room room;

    @BeforeEach
    void setUp() {
        owner = User.builder()
                .id(1L)
                .email("owner@streamly.com")
                .fullName("Room Owner")
                .build();

        guest = User.builder()
                .id(2L)
                .email("guest@streamly.com")
                .fullName("Guest User")
                .build();

        room = Room.builder()
                .id(100L)
                .name("Podcast Recording Studio")
                .owner(owner)
                .status(RoomStatus.ACTIVE)
                .participants(new ArrayList<>())
                .build();
    }

    @Test
    @DisplayName("createRoom - should create room and add owner as HOST participant")
    void createRoom_Success() {
        CreateRoomRequest request = new CreateRoomRequest("Podcast Recording Studio");

        when(roomRepository.save(any(Room.class))).thenAnswer(invocation -> {
            Room r = invocation.getArgument(0);
            r.setId(100L);
            return r;
        });

        RoomResponse response = roomService.createRoom(request, owner);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(100L);
        assertThat(response.getName()).isEqualTo("Podcast Recording Studio");
        assertThat(response.getOwnerId()).isEqualTo(1L);
        assertThat(response.getStatus()).isEqualTo(RoomStatus.ACTIVE);
        assertThat(response.getParticipants()).hasSize(1);
        assertThat(response.getParticipants().get(0).getRole()).isEqualTo(ParticipantRole.HOST);
        verify(roomRepository, times(1)).save(any(Room.class));
    }

    @Test
    @DisplayName("joinRoom - should add guest as LISTENER participant")
    void joinRoom_Success() {
        when(roomRepository.findById(100L)).thenReturn(Optional.of(room));
        when(participantRepository.existsByRoomIdAndUserId(100L, 2L)).thenReturn(false);

        Participant savedParticipant = Participant.builder()
                .id(50L)
                .room(room)
                .user(guest)
                .role(ParticipantRole.LISTENER)
                .build();

        when(participantRepository.save(any(Participant.class))).thenReturn(savedParticipant);

        ParticipantResponse response = roomService.joinRoom(100L, guest);

        assertThat(response).isNotNull();
        assertThat(response.getUserId()).isEqualTo(2L);
        assertThat(response.getRole()).isEqualTo(ParticipantRole.LISTENER);
        verify(participantRepository, times(1)).save(any(Participant.class));
    }

    @Test
    @DisplayName("joinRoom - double join should throw ConflictException")
    void joinRoom_DoubleJoin_ThrowsConflictException() {
        when(roomRepository.findById(100L)).thenReturn(Optional.of(room));
        when(participantRepository.existsByRoomIdAndUserId(100L, 2L)).thenReturn(true);

        assertThatThrownBy(() -> roomService.joinRoom(100L, guest))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("User is already a participant in this room");

        verify(participantRepository, never()).save(any(Participant.class));
    }

    @Test
    @DisplayName("joinRoom - deleted room should throw BadRequestException")
    void joinRoom_DeletedRoom_ThrowsBadRequestException() {
        room.setStatus(RoomStatus.DELETED);
        when(roomRepository.findById(100L)).thenReturn(Optional.of(room));

        assertThatThrownBy(() -> roomService.joinRoom(100L, guest))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Cannot join a deleted room");

        verify(participantRepository, never()).save(any(Participant.class));
    }

    @Test
    @DisplayName("joinRoom - ended room should throw BadRequestException")
    void joinRoom_EndedRoom_ThrowsBadRequestException() {
        room.setStatus(RoomStatus.ENDED);
        when(roomRepository.findById(100L)).thenReturn(Optional.of(room));

        assertThatThrownBy(() -> roomService.joinRoom(100L, guest))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Cannot join an ended room");

        verify(participantRepository, never()).save(any(Participant.class));
    }

    @Test
    @DisplayName("leaveRoom - should delete participant record")
    void leaveRoom_Success() {
        Participant participant = Participant.builder()
                .id(50L)
                .room(room)
                .user(guest)
                .build();

        when(roomRepository.findById(100L)).thenReturn(Optional.of(room));
        when(participantRepository.findByRoomIdAndUserId(100L, 2L)).thenReturn(Optional.of(participant));

        roomService.leaveRoom(100L, guest);

        verify(participantRepository, times(1)).delete(participant);
    }

    @Test
    @DisplayName("leaveRoom - non-participant should throw BadRequestException")
    void leaveRoom_NotParticipant_ThrowsBadRequestException() {
        when(roomRepository.findById(100L)).thenReturn(Optional.of(room));
        when(participantRepository.findByRoomIdAndUserId(100L, 2L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> roomService.leaveRoom(100L, guest))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("User is not a participant in this room");

        verify(participantRepository, never()).delete(any());
    }

    @Test
    @DisplayName("deleteRoom - owner should successfully soft delete room")
    void deleteRoom_Owner_Success() {
        when(roomRepository.findById(100L)).thenReturn(Optional.of(room));

        roomService.deleteRoom(100L, owner);

        assertThat(room.getStatus()).isEqualTo(RoomStatus.DELETED);
        verify(roomRepository, times(1)).save(room);
    }

    @Test
    @DisplayName("deleteRoom - non-owner should throw AccessDeniedException (403)")
    void deleteRoom_NonOwner_ThrowsAccessDeniedException() {
        when(roomRepository.findById(100L)).thenReturn(Optional.of(room));

        assertThatThrownBy(() -> roomService.deleteRoom(100L, guest))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Only the room owner can delete this room");

        verify(roomRepository, never()).save(any());
    }

    @Test
    @DisplayName("listMyRooms - should return list of active rooms user participates in or owns")
    void listMyRooms_Success() {
        when(roomRepository.findUserRoomsExcludingStatus(1L, RoomStatus.DELETED))
                .thenReturn(List.of(room));

        List<RoomResponse> rooms = roomService.listMyRooms(owner);

        assertThat(rooms).hasSize(1);
        assertThat(rooms.get(0).getName()).isEqualTo("Podcast Recording Studio");
    }

    @Test
    @DisplayName("getRoomById - should return room details")
    void getRoomById_Success() {
        when(roomRepository.findByIdAndStatusNot(100L, RoomStatus.DELETED))
                .thenReturn(Optional.of(room));

        RoomResponse response = roomService.getRoomById(100L, owner);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(100L);
    }

    @Test
    @DisplayName("getRoomById - non-existent or deleted room should throw ResourceNotFoundException")
    void getRoomById_NotFound_ThrowsResourceNotFoundException() {
        when(roomRepository.findByIdAndStatusNot(999L, RoomStatus.DELETED))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> roomService.getRoomById(999L, owner))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Room not found with ID: 999");
    }
}
