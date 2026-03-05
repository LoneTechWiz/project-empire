package com.empire.controller;

import com.empire.dto.ApiResponse;
import com.empire.repository.AllianceRepository;
import com.empire.repository.NationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {

    private final NationRepository nationRepo;
    private final AllianceRepository allianceRepo;

    @GetMapping
    public ResponseEntity<?> search(@RequestParam(defaultValue = "") String q) {
        if (q.isBlank()) return ResponseEntity.ok(ApiResponse.ok(Map.of("nations", List.of(), "alliances", List.of())));
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
            "nations",   nationRepo.findByNameContainingIgnoreCaseOrLeaderNameContainingIgnoreCase(q, q),
            "alliances", allianceRepo.findByNameContainingIgnoreCase(q)
        )));
    }
}
