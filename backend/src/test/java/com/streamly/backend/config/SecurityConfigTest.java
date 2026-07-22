package com.streamly.backend.config;

import com.streamly.backend.auth.exception.JwtAuthenticationEntryPoint;
import com.streamly.backend.auth.filter.JwtAuthenticationFilter;
import com.streamly.backend.auth.service.JwtService;
import com.streamly.backend.controller.HealthController;
import com.streamly.backend.exception.GlobalExceptionHandler;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {HealthController.class, SecurityConfigTest.ProtectedTestController.class})
@Import({SecurityConfig.class, GlobalExceptionHandler.class, JwtAuthenticationEntryPoint.class, SecurityConfigTest.ProtectedTestController.class})
@AutoConfigureMockMvc
public class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JwtAuthenticationFilter jwtAuthFilter;

    @MockBean
    private UserDetailsService userDetailsService;

    @MockBean
    private JwtService jwtService;

    @BeforeEach
    public void setup() throws Exception {
        doAnswer(invocation -> {
            HttpServletRequest request = invocation.getArgument(0);
            HttpServletResponse response = invocation.getArgument(1);
            FilterChain chain = invocation.getArgument(2);
            chain.doFilter(request, response);
            return null;
        }).when(jwtAuthFilter).doFilter(any(), any(), any());
    }

    @RestController
    public static class ProtectedTestController {
        @GetMapping("/api/v2/protected")
        public String protectedEndpoint() {
            return "protected";
        }
    }

    @Test
    public void testPermitAllV1Health() throws Exception {
        // /v1/health is permitted and exists, so it should return 200 OK
        mockMvc.perform(get("/v1/health"))
                .andExpect(status().isOk());
    }

    @Test
    public void testProtectedEndpointWithoutJwtReturnsUnauthorized() throws Exception {
        // Any protected request hit without JWT should be rejected with 401 Unauthorized by JwtAuthenticationEntryPoint
        mockMvc.perform(get("/api/v2/protected"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"))
                .andExpect(jsonPath("$.message").value("Unauthorized: Authentication token is missing or invalid"));
    }
}
