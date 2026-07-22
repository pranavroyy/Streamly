package com.streamly.backend.exception;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.streamly.backend.auth.exception.JwtAuthenticationEntryPoint;
import com.streamly.backend.auth.filter.JwtAuthenticationFilter;
import com.streamly.backend.auth.service.JwtService;
import com.streamly.backend.config.SecurityConfig;
import com.streamly.backend.dto.ErrorResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {GlobalExceptionHandlerTest.TestController.class})
@Import({SecurityConfig.class, GlobalExceptionHandler.class, JwtAuthenticationEntryPoint.class, GlobalExceptionHandlerTest.TestController.class})
@AutoConfigureMockMvc(addFilters = false)
public class GlobalExceptionHandlerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private JwtAuthenticationFilter jwtAuthFilter;

    @MockBean
    private UserDetailsService userDetailsService;

    @MockBean
    private JwtService jwtService;

    @Data
    public static class DummyRequest {
        @NotBlank(message = "Name is required")
        private String name;
    }

    @RestController
    public static class TestController {
        @GetMapping("/v1/test/not-found")
        public void throwNotFound() {
            throw new ResourceNotFoundException("Resource not found message");
        }

        @GetMapping("/v1/test/bad-request")
        public void throwBadRequest() {
            throw new BadRequestException("Bad request message");
        }

        @GetMapping("/v1/test/generic")
        public void throwGeneric() {
            throw new RuntimeException("Generic message");
        }

        @GetMapping("/v1/test/bad-credentials")
        public void throwBadCredentials() {
            throw new BadCredentialsException("Bad credentials");
        }

        @GetMapping("/v1/test/user-not-found")
        public void throwUserNotFound() {
            throw new UsernameNotFoundException("User not found");
        }

        @GetMapping("/v1/test/jwt-exception")
        public void throwJwtException() {
            throw new io.jsonwebtoken.JwtException("Invalid token signature");
        }

        @PostMapping("/v1/test/validation")
        public void testValidation(@Valid @RequestBody DummyRequest request) {
            // No-op, just for validation testing
        }
    }

    @Test
    public void testResourceNotFoundExceptionShape() throws Exception {
        mockMvc.perform(get("/v1/test/not-found")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.message").value("Resource not found message"))
                .andExpect(jsonPath("$.details").isEmpty());
    }

    @Test
    public void testBadRequestExceptionShape() throws Exception {
        mockMvc.perform(get("/v1/test/bad-request")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("Bad request message"))
                .andExpect(jsonPath("$.details").isEmpty());
    }

    @Test
    public void testGenericExceptionShape() throws Exception {
        mockMvc.perform(get("/v1/test/generic")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.error").value("Internal Server Error"))
                .andExpect(jsonPath("$.message").value("An internal server error occurred. Please try again later."))
                .andExpect(jsonPath("$.details").isEmpty());
    }

    @Test
    public void testBadCredentialsExceptionShape() throws Exception {
        mockMvc.perform(get("/v1/test/bad-credentials")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"))
                .andExpect(jsonPath("$.message").value("Invalid email or password"))
                .andExpect(jsonPath("$.details").isEmpty());
    }

    @Test
    public void testUserNotFoundExceptionShape() throws Exception {
        mockMvc.perform(get("/v1/test/user-not-found")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"))
                .andExpect(jsonPath("$.message").value("Invalid email or password"))
                .andExpect(jsonPath("$.details").isEmpty());
    }

    @Test
    public void testJwtExceptionShape() throws Exception {
        mockMvc.perform(get("/v1/test/jwt-exception")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"))
                .andExpect(jsonPath("$.message").value("Invalid or expired JWT token"))
                .andExpect(jsonPath("$.details").isEmpty());
    }

    @Test
    public void testValidationExceptionShape() throws Exception {
        DummyRequest invalidRequest = new DummyRequest();
        invalidRequest.setName(""); // Invalid, fails @NotBlank

        mockMvc.perform(post("/v1/test/validation")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.details").isArray())
                .andExpect(jsonPath("$.details[0].field").value("name"))
                .andExpect(jsonPath("$.details[0].reason").value("Name is required"));
    }
}
