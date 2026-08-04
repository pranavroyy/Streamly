package com.streamly.backend.room.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.streamly.backend.auth.exception.JwtAuthenticationEntryPoint;
import com.streamly.backend.auth.filter.JwtAuthenticationFilter;
import com.streamly.backend.auth.service.JwtService;
import com.streamly.backend.config.SecurityConfig;
import com.streamly.backend.exception.GlobalExceptionHandler;

import com.streamly.backend.room.dto.CreateRoomRequest;
import com.streamly.backend.room.dto.ParticipantResponse;
import com.streamly.backend.room.dto.RoomResponse;
import com.streamly.backend.room.entity.ParticipantRole;
import com.streamly.backend.room.entity.RoomStatus;
import com.streamly.backend.room.service.RoomService;
import com.streamly.backend.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = RoomController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class, JwtAuthenticationEntryPoint.class})
@AutoConfigureMockMvc(addFilters = false)
class RoomControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private RoomService roomService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthFilter;

    @MockBean
    private UserDetailsService userDetailsService;

    @MockBean
    private JwtService jwtService;

    private RoomResponse sampleRoomResponse;

    @BeforeEach
    void setUp() {
        sampleRoomResponse = RoomResponse.builder()
                .id(100L)
                .name("Podcast Studio A")
                .ownerId(1L)
                .ownerName("Owner Name")
                .status(RoomStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .participants(List.of())
                .build();
    }

    @Test
    @DisplayName("POST /v1/rooms - should create room and return 201 Created")
    void createRoom_Success() throws Exception {
        CreateRoomRequest request = new CreateRoomRequest("Podcast Studio A");

        when(roomService.createRoom(any(CreateRoomRequest.class), any())).thenReturn(sampleRoomResponse);

        mockMvc.perform(post("/v1/rooms")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(100L))
                .andExpect(jsonPath("$.name").value("Podcast Studio A"))
                .andExpect(jsonPath("$.ownerId").value(1L))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    @DisplayName("POST /v1/rooms - invalid request should return 400 Bad Request")
    void createRoom_ValidationError() throws Exception {
        CreateRoomRequest request = new CreateRoomRequest("");

        mockMvc.perform(post("/v1/rooms")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Validation failed"));
    }

    @Test
    @DisplayName("GET /v1/rooms/my - should return list of my rooms")
    void listMyRooms_Success() throws Exception {
        when(roomService.listMyRooms(any())).thenReturn(List.of(sampleRoomResponse));

        mockMvc.perform(get("/v1/rooms/my"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(100L))
                .andExpect(jsonPath("$[0].name").value("Podcast Studio A"));
    }

    @Test
    @DisplayName("GET /v1/rooms/{id} - should return room details")
    void getRoom_Success() throws Exception {
        when(roomService.getRoomByIdentifier(eq("100"), any())).thenReturn(sampleRoomResponse);

        mockMvc.perform(get("/v1/rooms/100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(100L));
    }

    @Test
    @DisplayName("POST /v1/rooms/{id}/join - should join room")
    void joinRoom_Success() throws Exception {
        ParticipantResponse participantResponse = ParticipantResponse.builder()
                .id(50L)
                .roomId(100L)
                .userId(2L)
                .role(ParticipantRole.LISTENER)
                .joinedAt(LocalDateTime.now())
                .build();

        when(roomService.joinRoom(eq("100"), any())).thenReturn(participantResponse);

        mockMvc.perform(post("/v1/rooms/100/join"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(50L))
                .andExpect(jsonPath("$.role").value("LISTENER"));
    }

    @Test
    @DisplayName("POST /v1/rooms/{id}/leave - should leave room and return 204 No Content")
    void leaveRoom_Success() throws Exception {
        doNothing().when(roomService).leaveRoom(eq("100"), any());

        mockMvc.perform(post("/v1/rooms/100/leave"))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("DELETE /v1/rooms/{id} - owner deletion returns 204 No Content")
    void deleteRoom_Owner_Success() throws Exception {
        doNothing().when(roomService).deleteRoom(eq("100"), any());

        mockMvc.perform(delete("/v1/rooms/100"))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("DELETE /v1/rooms/{id} - non-owner deletion returns 403 Forbidden")
    void deleteRoom_NonOwner_Forbidden() throws Exception {
        doThrow(new AccessDeniedException("Only the room owner can delete this room"))
                .when(roomService).deleteRoom(eq("100"), any());

        mockMvc.perform(delete("/v1/rooms/100"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.error").value("Forbidden"))
                .andExpect(jsonPath("$.message").value("Access denied"));
    }
}
