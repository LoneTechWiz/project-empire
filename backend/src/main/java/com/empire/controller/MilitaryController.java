package com.empire.controller;

import com.empire.dto.ApiResponse;
import com.empire.model.*;
import com.empire.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/military")
@RequiredArgsConstructor
public class MilitaryController {

    private final NationRepository nationRepo;
    private final UserRepository userRepo;
    private final CityRepository cityRepo;

    private Nation requireNation(UserDetails ud) {
        User user = userRepo.findByUsername(ud.getUsername()).orElseThrow();
        return nationRepo.findByUser(user).orElseThrow();
    }

    private Map<String, Long> getMax(Nation n, long cityCount) {
        return Map.of(
            "soldiers", cityCount * 15000,
            "tanks", cityCount * 1250,
            "aircraft", cityCount * 75,
            "ships", cityCount * 15,
            "spies", Math.min(60, cityCount * 5)
        );
    }

    @GetMapping
    public ResponseEntity<?> get(@AuthenticationPrincipal UserDetails ud) {
        Nation n = requireNation(ud);
        long cityCount = cityRepo.countByNation(n);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("nation", n, "max", getMax(n, cityCount))));
    }

    @PostMapping("/buy")
    public ResponseEntity<?> buy(@RequestBody Map<String, Object> body,
                                 @AuthenticationPrincipal UserDetails ud) {
        Nation nation = requireNation(ud);
        String unit = (String) body.get("unit");
        int qty = Integer.parseInt(body.get("quantity").toString());
        if (qty <= 0) return ResponseEntity.badRequest().body(ApiResponse.error("Invalid quantity."));

        long cityCount = cityRepo.countByNation(nation);
        Map<String, Long> max = getMax(nation, cityCount);

        try {
            switch (unit) {
                case "soldiers" -> {
                    if (max.containsKey("soldiers") && nation.getSoldiers() + qty > max.get("soldiers"))
                        return ResponseEntity.badRequest().body(ApiResponse.error("Exceeds max soldiers."));
                    double money = 5.0 * qty, food = 0.01 * qty;
                    if (nation.getMoney() < money) return fail("Not enough money.");
                    if (nation.getFood() < food) return fail("Not enough food.");
                    nation.setSoldiers(nation.getSoldiers() + qty);
                    nation.setMoney(nation.getMoney() - money);
                    nation.setFood(nation.getFood() - food);
                }
                case "tanks" -> {
                    if (nation.getTanks() + qty > max.getOrDefault("tanks", Long.MAX_VALUE))
                        return fail("Exceeds max tanks.");
                    double money = 60.0*qty, steel = 0.5*qty, gas = 0.1*qty;
                    if (nation.getMoney() < money || nation.getSteel() < steel || nation.getGasoline() < gas)
                        return fail("Insufficient resources.");
                    nation.setTanks(nation.getTanks() + qty);
                    nation.setMoney(nation.getMoney() - money);
                    nation.setSteel(nation.getSteel() - steel);
                    nation.setGasoline(nation.getGasoline() - gas);
                }
                case "aircraft" -> {
                    if (nation.getAircraft() + qty > max.getOrDefault("aircraft", Long.MAX_VALUE))
                        return fail("Exceeds max aircraft.");
                    double money = 4000.0*qty, alum = 5.0*qty, gas = 5.0*qty;
                    if (nation.getMoney() < money || nation.getAluminum() < alum || nation.getGasoline() < gas)
                        return fail("Insufficient resources.");
                    nation.setAircraft(nation.getAircraft() + qty);
                    nation.setMoney(nation.getMoney() - money);
                    nation.setAluminum(nation.getAluminum() - alum);
                    nation.setGasoline(nation.getGasoline() - gas);
                }
                case "ships" -> {
                    if (nation.getShips() + qty > max.getOrDefault("ships", Long.MAX_VALUE))
                        return fail("Exceeds max ships.");
                    double money = 50000.0*qty, steel = 30.0*qty, alum = 20.0*qty;
                    if (nation.getMoney() < money || nation.getSteel() < steel || nation.getAluminum() < alum)
                        return fail("Insufficient resources.");
                    nation.setShips(nation.getShips() + qty);
                    nation.setMoney(nation.getMoney() - money);
                    nation.setSteel(nation.getSteel() - steel);
                    nation.setAluminum(nation.getAluminum() - alum);
                }
                case "spies" -> {
                    if (nation.getSpies() + qty > max.getOrDefault("spies", Long.MAX_VALUE))
                        return fail("Exceeds max spies.");
                    double money = 50000.0 * qty;
                    if (nation.getMoney() < money) return fail("Not enough money.");
                    nation.setSpies(nation.getSpies() + qty);
                    nation.setMoney(nation.getMoney() - money);
                }
                case "missiles" -> {
                    double money = 150000.0*qty, alum = 100.0*qty, gas = 75.0*qty, mun = 75.0*qty;
                    if (nation.getMoney() < money || nation.getAluminum() < alum
                        || nation.getGasoline() < gas || nation.getMunitions() < mun)
                        return fail("Insufficient resources.");
                    nation.setMissiles(nation.getMissiles() + qty);
                    nation.setMoney(nation.getMoney() - money);
                    nation.setAluminum(nation.getAluminum() - alum);
                    nation.setGasoline(nation.getGasoline() - gas);
                    nation.setMunitions(nation.getMunitions() - mun);
                }
                case "nukes" -> {
                    double money = 1750000.0*qty, alum = 750.0*qty, gas = 500.0*qty,
                           mun = 375.0*qty, ura = 250.0*qty;
                    if (nation.getMoney() < money || nation.getAluminum() < alum
                        || nation.getGasoline() < gas || nation.getMunitions() < mun
                        || nation.getUranium() < ura)
                        return fail("Insufficient resources.");
                    nation.setNukes(nation.getNukes() + qty);
                    nation.setMoney(nation.getMoney() - money);
                    nation.setAluminum(nation.getAluminum() - alum);
                    nation.setGasoline(nation.getGasoline() - gas);
                    nation.setMunitions(nation.getMunitions() - mun);
                    nation.setUranium(nation.getUranium() - ura);
                }
                default -> { return fail("Unknown unit."); }
            }
        } catch (Exception e) {
            return fail("Purchase failed.");
        }

        return ResponseEntity.ok(ApiResponse.ok(nationRepo.save(nation)));
    }

    @PostMapping("/disband")
    public ResponseEntity<?> disband(@RequestBody Map<String, Object> body,
                                     @AuthenticationPrincipal UserDetails ud) {
        Nation nation = requireNation(ud);
        String unit = (String) body.get("unit");
        int qty = Integer.parseInt(body.get("quantity").toString());

        long current = switch (unit) {
            case "soldiers" -> nation.getSoldiers();
            case "tanks"    -> nation.getTanks();
            case "aircraft" -> nation.getAircraft();
            case "ships"    -> nation.getShips();
            case "spies"    -> nation.getSpies();
            case "missiles" -> nation.getMissiles();
            case "nukes"    -> nation.getNukes();
            default -> -1L;
        };
        if (current < 0) return fail("Unknown unit.");
        if (qty > current) return fail("Not enough units.");

        switch (unit) {
            case "soldiers" -> nation.setSoldiers(nation.getSoldiers() - qty);
            case "tanks"    -> nation.setTanks(nation.getTanks() - qty);
            case "aircraft" -> nation.setAircraft(nation.getAircraft() - qty);
            case "ships"    -> nation.setShips(nation.getShips() - qty);
            case "spies"    -> nation.setSpies(nation.getSpies() - qty);
            case "missiles" -> nation.setMissiles(nation.getMissiles() - qty);
            case "nukes"    -> nation.setNukes(nation.getNukes() - qty);
        }

        return ResponseEntity.ok(ApiResponse.ok(nationRepo.save(nation)));
    }

    private ResponseEntity<?> fail(String msg) {
        return ResponseEntity.badRequest().body(ApiResponse.error(msg));
    }

    // ── Spy operations ───────────────────────────────────────────────────────

    @PostMapping("/spies/operation")
    public ResponseEntity<?> spyOp(@RequestBody Map<String, Object> body,
                                   @AuthenticationPrincipal UserDetails ud) {
        Nation attacker = nationRepo.findById(
            nationRepo.findByUser(userRepo.findByUsername(ud.getUsername()).orElseThrow()).orElseThrow().getId()
        ).orElseThrow();

        if (attacker.getSpies() < 1) return fail("No spies available.");

        String op = (String) body.get("operation");
        if (op == null) return fail("Operation required.");

        Long targetId = Long.parseLong(body.getOrDefault("targetNationId", "0").toString());
        Nation target = nationRepo.findById(targetId).orElse(null);
        if (target == null) return fail("Target nation not found.");
        if (target.getId().equals(attacker.getId())) return fail("Cannot target yourself.");

        double successChance = (double) attacker.getSpies() / (attacker.getSpies() + target.getSpies() + 1);
        boolean success = Math.random() < successChance;

        Map<String, Object> result = new HashMap<>();
        result.put("success", success);
        result.put("targetNation", target.getName());

        switch (op) {
            case "steal_money" -> {
                if (success) {
                    double amount = Math.min(target.getMoney() * 0.05, 500000);
                    target.setMoney(Math.max(0, target.getMoney() - amount));
                    attacker.setMoney(attacker.getMoney() + amount);
                    nationRepo.save(target);
                    result.put("moneyStolen", amount);
                    result.put("message", "Stole $" + String.format("%,.0f", amount) + " from " + target.getName() + ".");
                } else {
                    attacker.setSpies(Math.max(0, attacker.getSpies() - 1));
                    result.put("message", "Operation failed. A spy was captured.");
                }
            }
            case "sabotage_infra" -> {
                if (success) {
                    List<City> cities = cityRepo.findByNation(target);
                    if (cities.isEmpty()) return fail("Target has no cities.");
                    City city = cities.get(new Random().nextInt(cities.size()));
                    double destroyed = 10 + Math.random() * 40;
                    city.setInfrastructure(Math.max(0, city.getInfrastructure() - destroyed));
                    cityRepo.save(city);
                    result.put("infraDestroyed", Math.round(destroyed));
                    result.put("city", city.getName());
                    result.put("message", "Sabotaged " + city.getName() + ", destroying " + Math.round(destroyed) + " infrastructure.");
                } else {
                    attacker.setSpies(Math.max(0, attacker.getSpies() - 1));
                    result.put("message", "Operation failed. A spy was captured.");
                }
            }
            case "gather_intel" -> {
                if (success) {
                    Map<String, Long> intel = new LinkedHashMap<>();
                    intel.put("soldiers", target.getSoldiers());
                    intel.put("tanks", target.getTanks());
                    intel.put("aircraft", target.getAircraft());
                    intel.put("ships", target.getShips());
                    intel.put("spies", target.getSpies());
                    intel.put("missiles", target.getMissiles());
                    intel.put("nukes", target.getNukes());
                    result.put("intel", intel);
                    result.put("message", "Intel successfully gathered on " + target.getName() + ".");
                } else {
                    attacker.setSpies(Math.max(0, attacker.getSpies() - 1));
                    result.put("message", "Operation failed. A spy was captured.");
                }
            }
            default -> { return fail("Unknown operation. Valid: steal_money, sabotage_infra, gather_intel."); }
        }

        nationRepo.save(attacker);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
