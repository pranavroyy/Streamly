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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RoomService {

    private static final String CODE_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final RoomRepository roomRepository;
    private final ParticipantRepository participantRepository;

    private String generateUniqueRoomCode() {
        String code;
        int attempts = 0;
        do {
            StringBuilder sb = new StringBuilder("rm-");
            for (int i = 0; i < 6; i++) {
                sb.append(CODE_CHARS.charAt(RANDOM.nextInt(CODE_CHARS.length())));
            }
            code = sb.toString();
            attempts++;
            if (attempts > 20) {
                code = "rm-" + System.currentTimeMillis();
                break;
            }
        } while (roomRepository.existsByCode(code));
        return code;
    }

    private Room findRoomByIdentifier(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            throw new BadRequestException("Room identifier cannot be empty");
        }

        // Try numeric ID first if identifier is digits
        try {
            Long numericId = Long.parseLong(identifier);
            return roomRepository.findById(numericId)
                    .orElseThrow(() -> new ResourceNotFoundException("Room not found with ID: " + numericId));
        } catch (NumberFormatException e) {
            // Otherwise try string room code
            return roomRepository.findByCode(identifier)
                    .orElseThrow(() -> new ResourceNotFoundException("Room not found with code: " + identifier));
        }
    }

    @Transactional
    public RoomResponse createRoom(CreateRoomRequest request, User owner) {
        log.info("Creating room '{}' for user ID: {}", request.getName(), owner.getId());

        String code = generateUniqueRoomCode();

        Room room = Room.builder()
                .name(request.getName().trim())
                .code(code)
                .owner(owner)
                .status(RoomStatus.ACTIVE)
                .build();

        Participant hostParticipant = Participant.builder()
                .room(room)
                .user(owner)
                .role(ParticipantRole.HOST)
                .build();

        room.getParticipants().add(hostParticipant);
        Room savedRoom = roomRepository.save(room);

        log.info("Room created successfully with ID: {} and Code: {}", savedRoom.getId(), savedRoom.getCode());
        return RoomResponse.fromEntity(savedRoom);
    }

    @Transactional
    public ParticipantResponse joinRoom(Long roomId, User user) {
        log.info("User ID: {} attempting to join room ID: {}", user.getId(), roomId);

        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with ID: " + roomId));

        if (room.getStatus() == RoomStatus.DELETED) {
            throw new BadRequestException("Cannot join a deleted room");
        }

        if (room.getStatus() == RoomStatus.ENDED) {
            throw new BadRequestException("Cannot join an ended room");
        }

        if (participantRepository.existsByRoomIdAndUserId(roomId, user.getId())) {
            throw new ConflictException("User is already a participant in this room");
        }

        Participant participant = Participant.builder()
                .room(room)
                .user(user)
                .role(ParticipantRole.LISTENER)
                .build();

        Participant savedParticipant = participantRepository.save(participant);
        log.info("User ID: {} successfully joined room ID: {}", user.getId(), roomId);

        return ParticipantResponse.fromEntity(savedParticipant);
    }

    @Transactional
    public ParticipantResponse joinRoom(String identifier, User user) {
        try {
            Long numericId = Long.parseLong(identifier);
            return joinRoom(numericId, user);
        } catch (NumberFormatException e) {
            Room room = roomRepository.findByCode(identifier)
                    .orElseThrow(() -> new ResourceNotFoundException("Room not found with code: " + identifier));
            return joinRoom(room.getId(), user);
        }
    }

    @Transactional
    public void leaveRoom(Long roomId, User user) {
        log.info("User ID: {} attempting to leave room ID: {}", user.getId(), roomId);

        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with ID: " + roomId));

        Participant participant = participantRepository.findByRoomIdAndUserId(roomId, user.getId())
                .orElseThrow(() -> new BadRequestException("User is not a participant in this room"));

        participantRepository.delete(participant);
        log.info("User ID: {} left room ID: {}", user.getId(), roomId);
    }

    @Transactional
    public void leaveRoom(String identifier, User user) {
        try {
            Long numericId = Long.parseLong(identifier);
            leaveRoom(numericId, user);
        } catch (NumberFormatException e) {
            Room room = roomRepository.findByCode(identifier)
                    .orElseThrow(() -> new ResourceNotFoundException("Room not found with code: " + identifier));
            leaveRoom(room.getId(), user);
        }
    }

    @Transactional
    public void deleteRoom(Long roomId, User user) {
        log.info("User ID: {} attempting to delete room ID: {}", user.getId(), roomId);

        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with ID: " + roomId));

        if (!room.getOwner().getId().equals(user.getId())) {
            log.warn("User ID: {} unauthorized deletion attempt on room ID: {}", user.getId(), roomId);
            throw new AccessDeniedException("Only the room owner can delete this room");
        }

        room.setStatus(RoomStatus.DELETED);
        roomRepository.save(room);
        log.info("Room ID: {} deleted (status updated to DELETED) by owner ID: {}", roomId, user.getId());
    }

    @Transactional
    public void deleteRoom(String identifier, User user) {
        try {
            Long numericId = Long.parseLong(identifier);
            deleteRoom(numericId, user);
        } catch (NumberFormatException e) {
            Room room = roomRepository.findByCode(identifier)
                    .orElseThrow(() -> new ResourceNotFoundException("Room not found with code: " + identifier));
            deleteRoom(room.getId(), user);
        }
    }

    @Transactional(readOnly = true)
    public List<RoomResponse> listMyRooms(User user) {
        log.info("Fetching rooms for user ID: {}", user.getId());
        List<Room> rooms = roomRepository.findUserRoomsExcludingStatus(user.getId(), RoomStatus.DELETED);
        return rooms.stream()
                .map(RoomResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public RoomResponse getRoomById(Long roomId, User user) {
        log.info("Fetching room details for room ID: {} by user ID: {}", roomId, user.getId());
        Room room = roomRepository.findByIdAndStatusNot(roomId, RoomStatus.DELETED)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with ID: " + roomId));

        return RoomResponse.fromEntity(room);
    }

    @Transactional(readOnly = true)
    public RoomResponse getRoomByIdentifier(String identifier, User user) {
        log.info("Fetching room details for room: {} by user ID: {}", identifier, user.getId());
        try {
            Long numericId = Long.parseLong(identifier);
            return getRoomById(numericId, user);
        } catch (NumberFormatException e) {
            Room room = roomRepository.findByCodeAndStatusNot(identifier, RoomStatus.DELETED)
                    .orElseThrow(() -> new ResourceNotFoundException("Room not found with code: " + identifier));
            return RoomResponse.fromEntity(room);
        }
    }
}
