package com.streamly.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/v1/health")
public class HealthController {

    @GetMapping
    public ResponseEntity<Map<String, Object>> getHealth() {
        Map<String, Object> response = Map.of(
            "status", "UP",
            "message", "Streamly API is running smoothly",
            "timestamp", LocalDateTime.now()
        );
        return ResponseEntity.ok(response);
    }
}
