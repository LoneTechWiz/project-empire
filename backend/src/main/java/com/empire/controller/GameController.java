package com.empire.controller;

import com.empire.dto.ApiResponse;
import com.empire.service.GameTickService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/game")
@RequiredArgsConstructor
public class GameController {

    private final GameTickService gameTickService;

    @GetMapping("/info")
    public ResponseEntity<?> getGameInfo() {
        long lastTick = gameTickService.getLastTickEpochMs();
        long interval = gameTickService.getTickIntervalMs();
        long nextTick = lastTick + interval;
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
            "lastTickMs", lastTick,
            "nextTickMs", nextTick,
            "intervalMs", interval
        )));
    }
}
