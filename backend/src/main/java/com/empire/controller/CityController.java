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

import java.lang.reflect.Field;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/cities")
@RequiredArgsConstructor
public class CityController {

    private final CityRepository cityRepo;
    private final NationRepository nationRepo;
    private final UserRepository userRepo;
    private final ActivityLogRepository activityLogRepo;
    private final EconomyEngine economy;

    private static final Map<String, Integer> IMP_COSTS = Map.ofEntries(
        Map.entry("impCoalpower", 5000), Map.entry("impOilpower", 4000),
        Map.entry("impNuclearpower", 500000), Map.entry("impWindpower", 3000),
        Map.entry("impCoalmine", 1000), Map.entry("impOilwell", 1500),
        Map.entry("impIronmine", 9500), Map.entry("impBauxitemine", 9500),
        Map.entry("impLeadmine", 7500), Map.entry("impUraniummine", 25000),
        Map.entry("impFarm", 1000), Map.entry("impOilrefinery", 45000),
        Map.entry("impSteelmill", 45000), Map.entry("impAluminumrefinery", 30000),
        Map.entry("impMunitionsfactory", 35000), Map.entry("impPolicestation", 10000),
        Map.entry("impHospital", 100000), Map.entry("impRecyclingcenter", 125000),
        Map.entry("impSubway", 250000), Map.entry("impSupermarket", 5000),
        Map.entry("impBank", 15000), Map.entry("impMall", 50000), Map.entry("impStadium", 100000)
    );
    private Nation requireNation(UserDetails ud) {
        User user = userRepo.findByUsername(ud.getUsername()).orElseThrow();
        return nationRepo.findByUser(user).orElseThrow(() -> new IllegalStateException("No nation."));
    }

    private int[] countImps(City city) throws Exception {
        int total = 0;
        for (String imp : IMP_COSTS.keySet()) {
            Field f = City.class.getDeclaredField(imp);
            f.setAccessible(true);
            total += (int) f.get(city);
        }
        return new int[]{total};
    }

    private double infraCost(double current, double target) {
        double cost = 0;
        for (double i = current; i < target; i++) cost += 10 + (i * 2);
        return cost;
    }

    private double cityBuyCost(long count) { return 50000 + count * 50000; }

    @GetMapping
    public ResponseEntity<?> list(@AuthenticationPrincipal UserDetails ud) {
        Nation nation = requireNation(ud);
        List<City> cities = cityRepo.findByNation(nation);
        List<Map<String, Object>> result = cities.stream().map(c -> {
            Map<String, Object> m = new HashMap<>();
            m.put("city", c);
            double[] pw = economy.getCityPower(c);
            m.put("powerAvailable", pw[0]);
            m.put("powerNeeded", pw[1]);
            m.put("powered", pw[0] >= pw[1]);
            m.put("commerce", economy.getCityCommerce(c));
            m.put("production", economy.calcCityProduction(c, nation));
            return m;
        }).collect(Collectors.toList());
        long count = cities.size();
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
            "cities", result,
            "buyCost", cityBuyCost(count),
            "impCosts", IMP_COSTS
        )));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable Long id, @AuthenticationPrincipal UserDetails ud) {
        Nation nation = requireNation(ud);
        City city = cityRepo.findByIdAndNation(id, nation).orElse(null);
        if (city == null) return ResponseEntity.notFound().build();
        double[] pw = economy.getCityPower(city);
        int[] imps;
        try { imps = countImps(city); } catch (Exception e) { imps = new int[]{0}; }
        int impSlots = (int)(city.getInfrastructure() / 25);
        int commercePct = economy.getCityCommerce(city);
        Map<String, Object> resp = new HashMap<>();
        resp.put("city", city);
        resp.put("powerAvailable", pw[0]); resp.put("powerNeeded", pw[1]); resp.put("powered", pw[0] >= pw[1]);
        resp.put("commerce", commercePct);
        resp.put("production", economy.calcCityProduction(city, nation));
        resp.put("impCosts", IMP_COSTS);
        resp.put("impSlots", impSlots); resp.put("impsUsed", imps[0]);
        resp.put("commerceUsed", commercePct);
        resp.put("deathRate", economy.calcDeathRate(city));
        resp.put("deathRateBreakdown", economy.calcDeathRateBreakdown(city));
        resp.put("populationGrowth", economy.calcPopulationGrowth(city));
        return ResponseEntity.ok(ApiResponse.ok(resp));
    }

    @PostMapping
    public ResponseEntity<?> buy(@RequestBody Map<String, String> body,
                                 @AuthenticationPrincipal UserDetails ud) {
        Nation nation = requireNation(ud);
        String cityName = body.getOrDefault("name", "").trim();
        if (cityName.isEmpty()) return ResponseEntity.badRequest().body(ApiResponse.error("City name required."));

        long count = cityRepo.countByNation(nation);
        double cost = cityBuyCost(count);
        if (nation.getMoney() < cost)
            return ResponseEntity.badRequest().body(ApiResponse.error("Not enough money."));

        nation.setMoney(nation.getMoney() - cost);
        nationRepo.save(nation);
        City city = cityRepo.save(City.builder().nation(nation).name(cityName)
            .infrastructure(25).land(500).population(20000).build());
        activityLogRepo.save(ActivityLog.builder().nation(nation)
            .message("New city founded: " + cityName + ".").build());
        return ResponseEntity.ok(ApiResponse.ok(city));
    }

    @PostMapping("/{id}/build")
    public ResponseEntity<?> build(@PathVariable Long id,
                                   @RequestBody Map<String, String> body,
                                   @AuthenticationPrincipal UserDetails ud) {
        Nation nation = requireNation(ud);
        City city = cityRepo.findByIdAndNation(id, nation).orElse(null);
        if (city == null) return ResponseEntity.notFound().build();

        String imp = body.get("improvement");
        if (!IMP_COSTS.containsKey(imp))
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid improvement."));

        try {
            int[] imps = countImps(city);
            int impSlots = (int)(city.getInfrastructure() / 25);
            if (imps[0] >= impSlots)
                return ResponseEntity.badRequest().body(ApiResponse.error("Not enough infrastructure for more improvements."));
            Field f = City.class.getDeclaredField(imp);
            f.setAccessible(true);
            int current = (int) f.get(city);

            double cost = IMP_COSTS.get(imp) * (1 + current * 0.5);
            if (nation.getMoney() < cost) return ResponseEntity.badRequest().body(ApiResponse.error("Not enough money."));

            f.set(city, current + 1);
            nation.setMoney(nation.getMoney() - cost);
            cityRepo.save(city);
            nationRepo.save(nation);
            return ResponseEntity.ok(ApiResponse.ok(city));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed to build improvement."));
        }
    }

    @PostMapping("/{id}/demolish")
    public ResponseEntity<?> demolish(@PathVariable Long id,
                                      @RequestBody Map<String, String> body,
                                      @AuthenticationPrincipal UserDetails ud) {
        Nation nation = requireNation(ud);
        City city = cityRepo.findByIdAndNation(id, nation).orElse(null);
        if (city == null) return ResponseEntity.notFound().build();

        String imp = body.get("improvement");
        if (!IMP_COSTS.containsKey(imp))
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid improvement."));
        try {
            Field f = City.class.getDeclaredField(imp);
            f.setAccessible(true);
            int current = (int) f.get(city);
            if (current <= 0) return ResponseEntity.badRequest().body(ApiResponse.error("Nothing to demolish."));
            f.set(city, current - 1);
            nation.setMoney(nation.getMoney() + IMP_COSTS.get(imp) * (1 + (current - 1) * 0.5) * 0.25);
            cityRepo.save(city);
            nationRepo.save(nation);
            return ResponseEntity.ok(ApiResponse.ok(city));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed."));
        }
    }

    @PostMapping("/{sourceId}/copy-to/{targetId}")
    public ResponseEntity<?> copyLayout(@PathVariable Long sourceId, @PathVariable Long targetId,
                                        @AuthenticationPrincipal UserDetails ud) {
        if (sourceId.equals(targetId))
            return ResponseEntity.badRequest().body(ApiResponse.error("Source and target must be different cities."));
        Nation nation = requireNation(ud);
        City source = cityRepo.findByIdAndNation(sourceId, nation).orElse(null);
        City target = cityRepo.findByIdAndNation(targetId, nation).orElse(null);
        if (source == null || target == null) return ResponseEntity.notFound().build();

        try {
            double netCost = 0;
            int totalSlotsNeeded = 0;
            Map<String, int[]> counts = new LinkedHashMap<>();

            for (String imp : IMP_COSTS.keySet()) {
                Field f = City.class.getDeclaredField(imp);
                f.setAccessible(true);
                int srcCount = (int) f.get(source);
                int tgtCount = (int) f.get(target);
                counts.put(imp, new int[]{srcCount, tgtCount});
                totalSlotsNeeded += srcCount;

                int delta = srcCount - tgtCount;
                if (delta > 0) {
                    for (int i = tgtCount; i < srcCount; i++)
                        netCost += IMP_COSTS.get(imp) * (1 + i * 0.5);
                } else if (delta < 0) {
                    for (int i = srcCount; i < tgtCount; i++)
                        netCost -= IMP_COSTS.get(imp) * (1 + i * 0.5) * 0.25;
                }
            }

            int targetSlots = (int)(target.getInfrastructure() / 25);
            if (totalSlotsNeeded > targetSlots)
                return ResponseEntity.badRequest().body(ApiResponse.error(
                    "Target city needs " + totalSlotsNeeded + " slots but only has " + targetSlots + ". Upgrade its infrastructure first."));

            if (nation.getMoney() < netCost)
                return ResponseEntity.badRequest().body(ApiResponse.error(
                    "Not enough money. Net cost: $" + String.format("%,.0f", netCost) + "."));

            for (Map.Entry<String, int[]> e : counts.entrySet()) {
                Field f = City.class.getDeclaredField(e.getKey());
                f.setAccessible(true);
                f.set(target, e.getValue()[0]);
            }
            nation.setMoney(nation.getMoney() - netCost);
            cityRepo.save(target);
            nationRepo.save(nation);

            return ResponseEntity.ok(ApiResponse.ok(Map.of("city", target, "netCost", netCost)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed to copy layout."));
        }
    }

    @PostMapping("/{id}/infra")
    public ResponseEntity<?> upgradeInfra(@PathVariable Long id,
                                          @RequestBody Map<String, Double> body,
                                          @AuthenticationPrincipal UserDetails ud) {
        Nation nation = requireNation(ud);
        City city = cityRepo.findByIdAndNation(id, nation).orElse(null);
        if (city == null) return ResponseEntity.notFound().build();

        double target = body.getOrDefault("target", 0.0);
        if (target <= city.getInfrastructure() || target > 5000)
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid target."));

        double cost = infraCost(city.getInfrastructure(), target);
        if (nation.getMoney() < cost) return ResponseEntity.badRequest().body(ApiResponse.error("Not enough money."));

        city.setInfrastructure(target);
        nation.setMoney(nation.getMoney() - cost);
        cityRepo.save(city);
        nationRepo.save(nation);
        return ResponseEntity.ok(ApiResponse.ok(city));
    }

    @PostMapping("/{id}/land")
    public ResponseEntity<?> buyLand(@PathVariable Long id,
                                     @RequestBody Map<String, Double> body,
                                     @AuthenticationPrincipal UserDetails ud) {
        Nation nation = requireNation(ud);
        City city = cityRepo.findByIdAndNation(id, nation).orElse(null);
        if (city == null) return ResponseEntity.notFound().build();

        double target = body.getOrDefault("target", 0.0);
        if (target <= city.getLand() || target > 10000)
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid target."));

        double cost = 0;
        for (double i = city.getLand(); i < target; i++) cost += 30 + (i * 0.2);
        if (nation.getMoney() < cost) return ResponseEntity.badRequest().body(ApiResponse.error("Not enough money."));

        city.setLand(target);
        nation.setMoney(nation.getMoney() - cost);
        cityRepo.save(city);
        nationRepo.save(nation);
        return ResponseEntity.ok(ApiResponse.ok(city));
    }
}
