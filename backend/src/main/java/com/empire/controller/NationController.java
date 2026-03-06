package com.empire.controller;

import com.empire.dto.ApiResponse;
import com.empire.game.EconomyEngine;
import com.empire.model.*;
import com.empire.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/nations")
@RequiredArgsConstructor
public class NationController {

    private final NationRepository nationRepo;
    private final UserRepository userRepo;
    private final CityRepository cityRepo;
    private final ActivityLogRepository activityLogRepo;
    private final WarRepository warRepo;
    private final EconomyEngine economy;

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, String> body,
                                    @AuthenticationPrincipal UserDetails ud) {
        User user = userRepo.findByUsername(ud.getUsername()).orElseThrow();
        if (nationRepo.findByUser(user).isPresent())
            return ResponseEntity.badRequest().body(ApiResponse.error("You already have a nation."));

        String name = body.get("name");
        String leaderName = body.get("leaderName");
        if (name == null || name.isBlank() || leaderName == null || leaderName.isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.error("Name and leader name required."));
        if (nationRepo.existsByName(name))
            return ResponseEntity.badRequest().body(ApiResponse.error("Nation name already taken."));

        String capital = body.getOrDefault("capital", name);
        Nation nation = nationRepo.save(Nation.builder()
            .user(user).name(name).leaderName(leaderName)
            .continent(body.getOrDefault("continent", "North America"))
            .color(body.getOrDefault("color", "gray"))
            .governmentType(body.getOrDefault("governmentType", "Republic"))
            .religion(body.getOrDefault("religion", "None"))
            .capital(capital)
            .build());

        cityRepo.save(City.builder().nation(nation).name(capital)
            .infrastructure(10).land(250).build());

        activityLogRepo.save(ActivityLog.builder().nation(nation)
            .message(name + " was founded by " + leaderName + ".").build());

        return ResponseEntity.ok(ApiResponse.ok(nation));
    }

    @GetMapping("/mine")
    public ResponseEntity<?> mine(@AuthenticationPrincipal UserDetails ud) {
        User user = userRepo.findByUsername(ud.getUsername()).orElseThrow();
        return nationRepo.findByUser(user)
            .map(n -> ResponseEntity.ok(ApiResponse.ok(n)))
            .orElse(ResponseEntity.ok(ApiResponse.ok(null)));
    }

    @GetMapping("/mine/finances")
    public ResponseEntity<?> finances(@AuthenticationPrincipal UserDetails ud) {
        User user = userRepo.findByUsername(ud.getUsername()).orElseThrow();
        Nation nation = nationRepo.findByUser(user).orElseThrow();
        List<City> cities = cityRepo.findByNation(nation);

        List<Map<String, Object>> cityBreakdown = new ArrayList<>();
        Map<String, Double> totals = new HashMap<>();

        for (City c : cities) {
            Map<String, Double> prod = economy.calcCityProduction(c, nation);
            double[] pw = economy.getCityPower(c);
            Map<String, Object> entry = new HashMap<>();
            entry.put("city", c);
            entry.put("production", prod);
            entry.put("commerce", economy.getCityCommerce(c));
            entry.put("powered", pw[0] >= pw[1]);
            entry.put("powerAvailable", pw[0]);
            entry.put("powerNeeded", pw[1]);
            entry.put("deathRate", economy.calcDeathRate(c));
            entry.put("populationGrowth", economy.calcPopulationGrowth(c));
            cityBreakdown.add(entry);
            prod.forEach((k, v) -> totals.merge(k, v, Double::sum));
        }

        Map<String, Double> milUpkeep = economy.calcMilitaryUpkeep(nation);
        milUpkeep.forEach((k, v) -> totals.merge(k, v, Double::sum));

        return ResponseEntity.ok(ApiResponse.ok(Map.of(
            "cities", cityBreakdown,
            "militaryUpkeep", milUpkeep,
            "totals", totals
        )));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable Long id) {
        return nationRepo.findById(id)
            .map(n -> {
                List<City> cities = cityRepo.findByNation(n);
                Map<String, Object> resp = new HashMap<>();
                resp.put("nation", n);
                resp.put("cities", cities);
                resp.put("cityCount", cities.size());
                resp.put("totalInfra", cities.stream().mapToDouble(City::getInfrastructure).sum());
                resp.put("recentActivity", activityLogRepo.findTop10ByNationOrderByCreatedAtDesc(n));
                resp.put("activeWars", warRepo.findByAttackerAndStatus(n, "active").size()
                    + warRepo.findByDefenderAndStatus(n, "active").size());
                return ResponseEntity.ok(ApiResponse.ok(resp));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
                                    @RequestBody Map<String, String> body,
                                    @AuthenticationPrincipal UserDetails ud) {
        User user = userRepo.findByUsername(ud.getUsername()).orElseThrow();
        Nation nation = nationRepo.findById(id).orElse(null);
        if (nation == null) return ResponseEntity.notFound().build();
        if (!nation.getUserId().equals(user.getId()))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden."));

        if (body.containsKey("leaderName")) nation.setLeaderName(body.get("leaderName"));
        if (body.containsKey("color")) nation.setColor(body.get("color"));
        if (body.containsKey("governmentType")) nation.setGovernmentType(body.get("governmentType"));
        if (body.containsKey("religion")) nation.setReligion(body.get("religion"));
        if (body.containsKey("warPolicy")) nation.setWarPolicy(body.get("warPolicy"));
        if (body.containsKey("domesticPolicy")) nation.setDomesticPolicy(body.get("domesticPolicy"));
        if (body.containsKey("capital")) nation.setCapital(body.get("capital"));

        return ResponseEntity.ok(ApiResponse.ok(nationRepo.save(nation)));
    }

    @GetMapping("/search")
    public ResponseEntity<?> search(@RequestParam String q) {
        return ResponseEntity.ok(ApiResponse.ok(
            nationRepo.findByNameContainingIgnoreCaseOrLeaderNameContainingIgnoreCase(q, q)
        ));
    }
}
