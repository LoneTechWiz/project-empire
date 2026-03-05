package com.empire.controller;

import com.empire.dto.ApiResponse;
import com.empire.model.Nation;
import com.empire.repository.AllianceRepository;
import com.empire.repository.CityRepository;
import com.empire.repository.NationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/rankings")
@RequiredArgsConstructor
public class RankingsController {

    private final NationRepository nationRepo;
    private final AllianceRepository allianceRepo;
    private final CityRepository cityRepo;

    @GetMapping("/nations")
    public ResponseEntity<?> nations(@RequestParam(defaultValue = "score") String category) {
        List<Nation> all = switch (category) {
            case "score"    -> nationRepo.findAllOrderByScoreDesc();
            case "soldiers" -> nationRepo.findAllOrderBySoldiersDesc();
            case "tanks"    -> nationRepo.findAllOrderByTanksDesc();
            case "aircraft" -> nationRepo.findAllOrderByAircraftDesc();
            case "ships"    -> nationRepo.findAllOrderByShipsDesc();
            default         -> nationRepo.findAllOrderByScoreDesc();
        };

        List<Map<String, Object>> ranked = new ArrayList<>();
        for (int i = 0; i < all.size(); i++) {
            Nation n = all.get(i);
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("rank", i + 1);
            entry.put("id", n.getId());
            entry.put("name", n.getName());
            entry.put("leaderName", n.getLeaderName());
            entry.put("flagUrl", n.getFlagUrl());
            entry.put("score", n.getScore());
            entry.put("soldiers", n.getSoldiers());
            entry.put("tanks", n.getTanks());
            entry.put("aircraft", n.getAircraft());
            entry.put("ships", n.getShips());
            entry.put("cityCount", cityRepo.countByNation(n));
            entry.put("allianceName", n.getAlliance() != null ? n.getAlliance().getName() : null);
            entry.put("allianceId", n.getAlliance() != null ? n.getAlliance().getId() : null);
            ranked.add(entry);
        }
        return ResponseEntity.ok(ApiResponse.ok(ranked));
    }

    @GetMapping("/alliances")
    public ResponseEntity<?> alliances() {
        List<Map<String, Object>> result = allianceRepo.findAll().stream().map(a -> {
            List<Nation> members = nationRepo.findAll().stream()
                .filter(n -> n.getAlliance() != null && n.getAlliance().getId().equals(a.getId())
                    && !"Applicant".equals(n.getAlliancePosition()))
                .collect(Collectors.toList());
            double totalScore = members.stream().mapToDouble(Nation::getScore).sum();
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("id", a.getId());
            entry.put("name", a.getName());
            entry.put("acronym", a.getAcronym());
            entry.put("flagUrl", a.getFlagUrl());
            entry.put("color", a.getColor());
            entry.put("memberCount", members.size());
            entry.put("totalScore", totalScore);
            return entry;
        }).sorted((x, y) -> Double.compare((Double) y.get("totalScore"), (Double) x.get("totalScore")))
          .collect(Collectors.toList());

        for (int i = 0; i < result.size(); i++) result.get(i).put("rank", i + 1);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
