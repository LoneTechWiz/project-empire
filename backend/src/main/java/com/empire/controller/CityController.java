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
    private static final Map<String, Integer> IMP_MAX = Map.ofEntries(
        Map.entry("impCoalpower", 5), Map.entry("impOilpower", 5), Map.entry("impNuclearpower", 5),
        Map.entry("impWindpower", 50), Map.entry("impCoalmine", 10), Map.entry("impOilwell", 10),
        Map.entry("impIronmine", 10), Map.entry("impBauxitemine", 10), Map.entry("impLeadmine", 10),
        Map.entry("impUraniummine", 5), Map.entry("impFarm", 20), Map.entry("impOilrefinery", 5),
        Map.entry("impSteelmill", 5), Map.entry("impAluminumrefinery", 5),
        Map.entry("impMunitionsfactory", 5), Map.entry("impPolicestation", 5),
        Map.entry("impHospital", 5), Map.entry("impRecyclingcenter", 5),
        Map.entry("impSubway", 3), Map.entry("impSupermarket", 5), Map.entry("impBank", 5),
        Map.entry("impMall", 5), Map.entry("impStadium", 3)
    );

    private Nation requireNation(UserDetails ud) {
        User user = userRepo.findByUsername(ud.getUsername()).orElseThrow();
        return nationRepo.findByUser(user).orElseThrow(() -> new IllegalStateException("No nation."));
    }

    private double infraCost(double current, double target) {
        double cost = 0;
        for (double i = current; i < target; i++) cost += 300 + (i * 150);
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
            "impCosts", IMP_COSTS,
            "impMax", IMP_MAX
        )));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable Long id, @AuthenticationPrincipal UserDetails ud) {
        Nation nation = requireNation(ud);
        City city = cityRepo.findByIdAndNation(id, nation).orElse(null);
        if (city == null) return ResponseEntity.notFound().build();
        double[] pw = economy.getCityPower(city);
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
            "city", city,
            "powerAvailable", pw[0], "powerNeeded", pw[1], "powered", pw[0] >= pw[1],
            "commerce", economy.getCityCommerce(city),
            "production", economy.calcCityProduction(city, nation),
            "impCosts", IMP_COSTS, "impMax", IMP_MAX
        )));
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
            .infrastructure(20).land(500).build());
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
            Field f = City.class.getDeclaredField(imp);
            f.setAccessible(true);
            int current = (int) f.get(city);
            int max = IMP_MAX.getOrDefault(imp, 5);
            if (current >= max) return ResponseEntity.badRequest().body(ApiResponse.error("Max reached."));

            double cost = IMP_COSTS.get(imp);
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
            nation.setMoney(nation.getMoney() + IMP_COSTS.get(imp) * 0.25);
            cityRepo.save(city);
            nationRepo.save(nation);
            return ResponseEntity.ok(ApiResponse.ok(city));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed."));
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

        double amount = body.getOrDefault("amount", 0.0);
        if (amount <= 0 || amount > 5000)
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid amount."));

        double cost = amount * 400;
        if (nation.getMoney() < cost) return ResponseEntity.badRequest().body(ApiResponse.error("Not enough money."));

        city.setLand(city.getLand() + amount);
        nation.setMoney(nation.getMoney() - cost);
        cityRepo.save(city);
        nationRepo.save(nation);
        return ResponseEntity.ok(ApiResponse.ok(city));
    }
}
