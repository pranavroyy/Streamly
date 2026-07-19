package com.streamly.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import com.streamly.backend.controller.HealthController;
import com.streamly.backend.exception.GlobalExceptionHandler;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = HealthController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
public class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    public void testPermitAllV1Health() throws Exception {
        // /v1/health is permitted and exists, so it should return 200 OK
        mockMvc.perform(get("/v1/health"))
                .andExpect(status().isOk());
    }

    @Test
    public void testPermitAllV1Wildcard() throws Exception {
        // Any /v1/** path should be permitted. A non-existent endpoint under /v1/ will pass security,
        // reach the DispatcherServlet, and return 404 Not Found (rather than 403 Forbidden).
        mockMvc.perform(get("/v1/non-existent-endpoint"))
                .andExpect(status().isNotFound());
    }

    @Test
    public void testPermitAllActuatorWildcard() throws Exception {
        // /actuator/** is permitted. Requesting a non-existent actuator endpoint should pass security
        // and fail with 404 Not Found (rather than 403 Forbidden).
        mockMvc.perform(get("/actuator/non-existent-endpoint"))
                .andExpect(status().isNotFound());
    }

    @Test
    public void testAnyOtherRequestAuthenticated() throws Exception {
        // Any request outside /v1/** and /actuator/** should be rejected with 403 Forbidden because of Spring Security defaults.
        mockMvc.perform(get("/api/v2/protected"))
                .andExpect(status().isForbidden());
    }
}
