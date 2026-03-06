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
            c.getInfrastructure() * 0.15 +
            (c.getImpCoalmine() + c.getImpOilwell() + c.getImpIronmine() +
             c.getImpBauxitemine() + c.getImpLeadmine() + c.getImpUraniummine()) * 3.0 +
            c.getImpFarm() * 2.0 +
            (c.getImpOilrefinery() + c.getImpSteelmill() + c.getImpAluminumrefinery()) * 6.0 +
            c.getImpMunitionsfactory() * 8.0 +
            (c.getImpPolicestation() + c.getImpHospital() + c.getImpRecyclingcenter() +
             c.getImpSubway() + c.getImpSupermarket() + c.getImpBank() +
             c.getImpMall() + c.getImpStadium()) * 1.5;

        return new double[]{available, needed};
    }

    public boolean isCityPowered(City c) {
        double[] pw = getCityPower(c);
        return pw[0] >= pw[1];
    }

    /** Commerce rate for a city (uncapped). */
    public int getCityCommerce(City c) {
        return c.getImpPolicestation() * 1 +
            c.getImpHospital() * 1 +
            c.getImpRecyclingcenter() * 2 +
            c.getImpSubway() * 8 +
            c.getImpSupermarket() * 3 +
            c.getImpBank() * 5 +
            c.getImpMall() * 9 +
            c.getImpStadium() * 12;
    }

    /**
     * Death rate for a city as a percentage (0–100+).
     * Polluting improvements increase it; hospitals, police, recycling, subways reduce it.
     */
    public double calcDeathRate(City c) {
        double rate = 0.5; // base
        // Polluters
        rate += c.getImpCoalpower()         * 0.5;
        rate += c.getImpOilpower()          * 0.3;
        rate += c.getImpNuclearpower()      * 0.3;
        rate += c.getImpCoalmine()          * 0.5;
        rate += c.getImpOilwell()           * 0.3;
        rate += c.getImpIronmine()          * 0.4;
        rate += c.getImpBauxitemine()       * 0.4;
        rate += c.getImpLeadmine()          * 0.5;
        rate += c.getImpUraniummine()       * 0.8;
        rate += c.getImpOilrefinery()       * 0.7;
        rate += c.getImpSteelmill()         * 0.8;
        rate += c.getImpAluminumrefinery()  * 0.6;
        rate += c.getImpMunitionsfactory()  * 0.5;
        // Reducers
        rate -= c.getImpPolicestation()     * 0.3;
        rate -= c.getImpHospital()          * 2.5;
        rate -= c.getImpRecyclingcenter()   * 1.0;
        rate -= c.getImpSubway()            * 0.5;
        return Math.max(0.0, rate);
    }

    /** Per-improvement breakdown of death rate contributions (positive = adds death, negative = reduces). */
    public Map<String, Double> calcDeathRateBreakdown(City c) {
        Map<String, Double> b = new java.util.LinkedHashMap<>();
        b.put("base", 0.5);
        if (c.getImpCoalpower() > 0)         b.put("coalPower",         c.getImpCoalpower()         * 0.5);
        if (c.getImpOilpower() > 0)          b.put("oilPower",          c.getImpOilpower()          * 0.3);
        if (c.getImpNuclearpower() > 0)      b.put("nuclearPower",      c.getImpNuclearpower()      * 0.3);
        if (c.getImpCoalmine() > 0)          b.put("coalMine",          c.getImpCoalmine()          * 0.5);
        if (c.getImpOilwell() > 0)           b.put("oilWell",           c.getImpOilwell()           * 0.3);
        if (c.getImpIronmine() > 0)          b.put("ironMine",          c.getImpIronmine()          * 0.4);
        if (c.getImpBauxitemine() > 0)       b.put("bauxiteMine",       c.getImpBauxitemine()       * 0.4);
        if (c.getImpLeadmine() > 0)          b.put("leadMine",          c.getImpLeadmine()          * 0.5);
        if (c.getImpUraniummine() > 0)       b.put("uraniumMine",       c.getImpUraniummine()       * 0.8);
        if (c.getImpOilrefinery() > 0)       b.put("oilRefinery",       c.getImpOilrefinery()       * 0.7);
        if (c.getImpSteelmill() > 0)         b.put("steelMill",         c.getImpSteelmill()         * 0.8);
        if (c.getImpAluminumrefinery() > 0)  b.put("aluminumRefinery",  c.getImpAluminumrefinery()  * 0.6);
        if (c.getImpMunitionsfactory() > 0)  b.put("munitionsFactory",  c.getImpMunitionsfactory()  * 0.5);
        if (c.getImpPolicestation() > 0)     b.put("policeStation",     -c.getImpPolicestation()    * 0.3);
        if (c.getImpHospital() > 0)          b.put("hospital",          -c.getImpHospital()         * 2.5);
        if (c.getImpRecyclingcenter() > 0)   b.put("recyclingCenter",   -c.getImpRecyclingcenter()  * 1.0);
        if (c.getImpSubway() > 0)            b.put("subway",            -c.getImpSubway()           * 0.5);
        return b;
    }

    /**
     * Net population change per tick.
     * Natural growth (density/infra-based) minus deaths from death rate.
     * At 10% death rate on a balanced city (50% capacity, 1 pop/acre), deaths ≈ natural growth.
     * Above 10% the city shrinks; below 10% it grows normally.
     */
    public long calcPopulationGrowth(City c) {
        long maxPop = (long)(c.getInfrastructure() * 1000);
        long currentPop = c.getPopulation();

        double naturalGrowth = 0;
        if (currentPop < maxPop) {
            double popPerAcre = currentPop / Math.max(c.getLand(), 1.0);
            double idealDensity = c.getLand() / Math.max(c.getInfrastructure(), 1.0) * 50.0;
            double densityFactor = idealDensity / Math.max(popPerAcre, idealDensity);
            double growthRate = 0.002 * densityFactor;
            naturalGrowth = (maxPop - currentPop) * growthRate;
        }

        double deathRate = calcDeathRate(c);
        // Growth is scaled by death rate — crossover is always exactly at 10%:
        //   0% death rate  → full natural growth
        //   5% death rate  → half natural growth
        //   10% death rate → net zero
        //   >10%           → growth term goes negative plus absolute population loss
        long growthComponent = Math.round(naturalGrowth * (1.0 - deathRate / 10.0));
        // Extra absolute loss above 10% so near-max cities still suffer high death rates
        long deathLoss = Math.round(currentPop * Math.max(0.0, deathRate - 10.0) / 2000.0);
        return Math.max(-currentPop, growthComponent - deathLoss);
    }

    /** Per-turn resource delta for one city. All values per-turn (every 2h = 1 turn, 12 turns/day). */
    public Map<String, Double> calcCityProduction(City c, Nation nation) {
        boolean powered = isCityPowered(c);
        double powerMult = powered ? 1.0 : 0.5;
        int commerce = getCityCommerce(c);
        Map<String, Double> d = new HashMap<>();
        for (String r : RESOURCES) d.put(r, 0.0);
        d.put("money", 0.0);

        // Power plant fuel consumption (always consumed regardless of powered status)
        d.merge("coal",    -c.getImpCoalpower()    * 1.2, Double::sum);
        d.merge("oil",     -c.getImpOilpower()     * 1.5, Double::sum);
        d.merge("uranium", -c.getImpNuclearpower() * 2.4, Double::sum);

        // Raw resources
        d.merge("coal",     c.getImpCoalmine()     * 3.0  * powerMult, Double::sum);
        d.merge("oil",      c.getImpOilwell()       * 3.0  * powerMult, Double::sum);
        d.merge("iron",     c.getImpIronmine()      * 3.0  * powerMult, Double::sum);
        d.merge("bauxite",  c.getImpBauxitemine()   * 3.0  * powerMult, Double::sum);
        d.merge("lead",     c.getImpLeadmine()      * 3.0  * powerMult, Double::sum);
        d.merge("uranium",  c.getImpUraniummine()   * 3.0  * powerMult, Double::sum);
        d.merge("food",     c.getLand() * (0.05 + 0.03 * c.getImpFarm()) * powerMult, Double::sum);

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

        // Commerce → money (based on population and commerce rate)
        long population = c.getPopulation();
        double moneyPerTurn = (population * (commerce / 100.0) * 1.0) / 12.0;
        d.put("money", moneyPerTurn);

        // Food consumption by population
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
