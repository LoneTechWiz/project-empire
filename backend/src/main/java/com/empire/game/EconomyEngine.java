package com.empire.game;

import com.empire.model.City;
import com.empire.model.Nation;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class EconomyEngine {

    public static final List<String> RESOURCES = List.of(
        "food", "coal", "oil", "iron", "bauxite", "lead", "uranium",
        "gasoline", "munitions", "steel", "aluminum"
    );

    public static final Map<String, Double> BASE_PRICES = Map.ofEntries(
        Map.entry("food", 125.0), Map.entry("coal", 50.0), Map.entry("oil", 60.0),
        Map.entry("iron", 60.0), Map.entry("bauxite", 70.0), Map.entry("lead", 45.0),
        Map.entry("uranium", 2750.0), Map.entry("gasoline", 325.0),
        Map.entry("munitions", 150.0), Map.entry("steel", 140.0), Map.entry("aluminum", 170.0)
    );

    /** Power available vs needed for a city. */
    public double[] getCityPower(City c) {
        double available =
            c.getImpCoalpower() * 500.0 +
            c.getImpOilpower() * 500.0 +
            c.getImpNuclearpower() * 2000.0 +
            c.getImpWindpower() * 250.0;

        double needed =
            (c.getImpCoalmine() + c.getImpOilwell() + c.getImpIronmine() +
             c.getImpBauxitemine() + c.getImpLeadmine() + c.getImpUraniummine()) * 1.2 +
            c.getImpFarm() * 1.0 +
            (c.getImpOilrefinery() + c.getImpSteelmill() + c.getImpAluminumrefinery()) * 3.0 +
            c.getImpMunitionsfactory() * 3.5 +
            (c.getImpPolicestation() + c.getImpHospital() + c.getImpRecyclingcenter() +
             c.getImpSubway() + c.getImpSupermarket() + c.getImpBank() +
             c.getImpMall() + c.getImpStadium()) * 0.5;

        return new double[]{available, needed};
    }

    public boolean isCityPowered(City c) {
        double[] pw = getCityPower(c);
        return pw[0] >= pw[1];
    }

    /** Commerce rate 0-100 for a city. */
    public int getCityCommerce(City c) {
        int commerce =
            c.getImpPolicestation() * 1 +
            c.getImpHospital() * 1 +
            c.getImpRecyclingcenter() * 2 +
            c.getImpSubway() * 8 +
            c.getImpSupermarket() * 3 +
            c.getImpBank() * 5 +
            c.getImpMall() * 9 +
            c.getImpStadium() * 12;
        return Math.min(commerce, 100);
    }

    /** Per-turn resource delta for one city. All values per-turn (every 2h = 1 turn, 12 turns/day). */
    public Map<String, Double> calcCityProduction(City c, Nation nation) {
        boolean powered = isCityPowered(c);
        double powerMult = powered ? 1.0 : 0.5;
        int commerce = getCityCommerce(c);
        Map<String, Double> d = new HashMap<>();
        for (String r : RESOURCES) d.put(r, 0.0);
        d.put("money", 0.0);

        // Raw resources
        d.merge("coal",     c.getImpCoalmine()     * 3.0  * powerMult, Double::sum);
        d.merge("oil",      c.getImpOilwell()       * 3.0  * powerMult, Double::sum);
        d.merge("iron",     c.getImpIronmine()      * 3.0  * powerMult, Double::sum);
        d.merge("bauxite",  c.getImpBauxitemine()   * 3.0  * powerMult, Double::sum);
        d.merge("lead",     c.getImpLeadmine()      * 3.0  * powerMult, Double::sum);
        d.merge("uranium",  c.getImpUraniummine()   * 3.0  * powerMult, Double::sum);
        d.merge("food",     c.getImpFarm()          * 12.0 * powerMult, Double::sum);

        // Industry
        d.merge("gasoline",  c.getImpOilrefinery()       *  6.0 * powerMult, Double::sum);
        d.merge("oil",      -c.getImpOilrefinery()       *  3.0 * powerMult, Double::sum);
        d.merge("steel",     c.getImpSteelmill()         *  9.0 * powerMult, Double::sum);
        d.merge("coal",     -c.getImpSteelmill()         *  3.0 * powerMult, Double::sum);
        d.merge("iron",     -c.getImpSteelmill()         *  3.0 * powerMult, Double::sum);
        d.merge("aluminum",  c.getImpAluminumrefinery()  *  9.0 * powerMult, Double::sum);
        d.merge("bauxite",  -c.getImpAluminumrefinery()  *  3.0 * powerMult, Double::sum);
        d.merge("munitions", c.getImpMunitionsfactory()  * 18.0 * powerMult, Double::sum);
        d.merge("lead",     -c.getImpMunitionsfactory()  *  6.0 * powerMult, Double::sum);

        // Commerce → money
        double infra = c.getInfrastructure();
        double moneyPerTurn = (infra * (commerce / 100.0) * 527.0) / 12.0;
        d.put("money", moneyPerTurn);

        // Food consumption by population
        long population = (long) (infra * 100 + c.getLand() * 0.5);
        double foodConsumed = (population / 1000.0) / 12.0;
        d.merge("food", -foodConsumed, Double::sum);

        return d;
    }

    /** Military upkeep per turn. */
    public Map<String, Double> calcMilitaryUpkeep(Nation n) {
        Map<String, Double> d = new HashMap<>();
        d.put("money", -(
            n.getSoldiers() * 1.25 +
            n.getTanks() * 50 +
            n.getAircraft() * 500 +
            n.getShips() * 3750
        ) / 12.0);
        d.put("food",      -(n.getSoldiers() * 0.001) / 12.0);
        d.put("gasoline",  -((n.getTanks() * 0.01 + n.getAircraft() * 0.05 + n.getShips() * 0.1)) / 12.0);
        d.put("munitions", -((n.getSoldiers() * 0.0005 + n.getTanks() * 0.005)) / 12.0);
        return d;
    }

    /** Recalculate score from cities, infra, military. */
    public double calcScore(Nation n, List<City> cities) {
        long cityCount = cities.size();
        double totalInfra = cities.stream().mapToDouble(City::getInfrastructure).sum();
        return cityCount * 100.0 +
            totalInfra * 0.5 +
            n.getSoldiers() * 0.000045 +
            n.getTanks() * 0.0015 +
            n.getAircraft() * 0.005 +
            n.getShips() * 0.025 +
            n.getSpies() * 0.003 +
            n.getMissiles() * 0.5 +
            n.getNukes() * 10.0;
    }
}
