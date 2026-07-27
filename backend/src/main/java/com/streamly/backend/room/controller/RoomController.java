package com.streamly.backend.room.controller;

import com.streamly.backend.room.dto.CreateRoomRequest;
import com.streamly.backend.room.dto.ParticipantResponse;
import com.streamly.backend.room.dto.RoomResponse;
import com.streamly.backend.room.service.RoomService;
import com.streamly.backend.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;

    @PostMapping
    public ResponseEntity<RoomResponse> createRoom(
            @Valid @RequestBody CreateRoomRequest request,
            @AuthenticationPrincipal User user) {
        RoomResponse response = roomService.createRoom(request, user);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/my")
    public ResponseEntity<List<RoomResponse>> listMyRooms(@AuthenticationPrincipal User user) {
        List<RoomResponse> response = roomService.listMyRooms(user);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoomResponse> getRoom(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        RoomResponse response = roomService.getRoomById(id, user);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/join")
    public ResponseEntity<ParticipantResponse> joinRoom(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        ParticipantResponse response = roomService.joinRoom(id, user);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/leave")
    public ResponseEntity<Void> leaveRoom(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        roomService.leaveRoom(id, user);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRoom(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        roomService.deleteRoom(id, user);
        return ResponseEntity.noContent().build();
    }
}
