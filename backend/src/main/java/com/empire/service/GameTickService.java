package com.empire.service;

import com.empire.game.EconomyEngine;
import com.empire.model.City;
import com.empire.model.Nation;
import com.empire.repository.CityRepository;
import com.empire.repository.NationRepository;
import com.empire.repository.WarRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class GameTickService {

    private final NationRepository nationRepo;
    private final CityRepository cityRepo;
    private final WarRepository warRepo;
    private final EconomyEngine economy;

    @Scheduled(fixedRateString = "${game.tick.interval-ms}")
    @Transactional
    public void runTick() {
        log.info("[TICK] Applying game tick...");
        List<Nation> nations = nationRepo.findAll();

        for (Nation nation : nations) {
            List<City> cities = cityRepo.findByNation(nation);
            Map<String, Double> totals = new java.util.HashMap<>();
            for (String r : EconomyEngine.RESOURCES) totals.put(r, 0.0);
            totals.put("money", 0.0);

            for (City city : cities) {
                Map<String, Double> delta = economy.calcCityProduction(city, nation);
                delta.forEach((k, v) -> totals.merge(k, v, Double::sum));
            }

            Map<String, Double> upkeep = economy.calcMilitaryUpkeep(nation);
            upkeep.forEach((k, v) -> totals.merge(k, v, Double::sum));

            applyDeltas(nation, totals);
            nation.setScore(economy.calcScore(nation, cities));
            nation.setTurns(Math.min(nation.getTurns() + 1, 10));
            nation.setBeigeTurns(Math.max(0, nation.getBeigeTurns() - 1));
        }

        nationRepo.saveAll(nations);

        // Expire wars older than 5 days
        warRepo.findAll().stream()
            .filter(w -> "active".equals(w.getStatus()))
            .filter(w -> w.getStartDate().isBefore(LocalDateTime.now().minusDays(5)))
            .forEach(w -> {
                w.setStatus("expired");
                w.setEndDate(LocalDateTime.now());
                warRepo.save(w);
            });

        log.info("[TICK] Done. Processed {} nations.", nations.size());
    }

    private void applyDeltas(Nation n, Map<String, Double> d) {
        n.setMoney(n.getMoney() + d.getOrDefault("money", 0.0));
        n.setFood(Math.max(0, n.getFood() + d.getOrDefault("food", 0.0)));
        n.setCoal(Math.max(0, n.getCoal() + d.getOrDefault("coal", 0.0)));
        n.setOil(Math.max(0, n.getOil() + d.getOrDefault("oil", 0.0)));
        n.setUranium(Math.max(0, n.getUranium() + d.getOrDefault("uranium", 0.0)));
        n.setIron(Math.max(0, n.getIron() + d.getOrDefault("iron", 0.0)));
        n.setBauxite(Math.max(0, n.getBauxite() + d.getOrDefault("bauxite", 0.0)));
        n.setLead(Math.max(0, n.getLead() + d.getOrDefault("lead", 0.0)));
        n.setGasoline(Math.max(0, n.getGasoline() + d.getOrDefault("gasoline", 0.0)));
        n.setMunitions(Math.max(0, n.getMunitions() + d.getOrDefault("munitions", 0.0)));
        n.setSteel(Math.max(0, n.getSteel() + d.getOrDefault("steel", 0.0)));
        n.setAluminum(Math.max(0, n.getAluminum() + d.getOrDefault("aluminum", 0.0)));
    }
}
