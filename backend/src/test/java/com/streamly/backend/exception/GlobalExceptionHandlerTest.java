package com.streamly.backend.exception;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.streamly.backend.dto.ErrorResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import com.streamly.backend.config.SecurityConfig;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {GlobalExceptionHandlerTest.TestController.class})
@Import({SecurityConfig.class, GlobalExceptionHandler.class, GlobalExceptionHandlerTest.TestController.class})
public class GlobalExceptionHandlerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

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
