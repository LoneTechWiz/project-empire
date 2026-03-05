package com.empire.game;

import com.empire.model.Nation;
import com.empire.model.War;
import com.empire.model.WarAttack;
import org.springframework.stereotype.Component;

import java.util.Random;

@Component
public class WarEngine {

    private final Random rng = new Random();

    private double roll(double min, double max) {
        return min + rng.nextDouble() * (max - min);
    }

    private double clamp(double val, double min, double max) {
        return Math.max(min, Math.min(max, val));
    }

    public WarAttack.WarAttackBuilder resolveAttack(String type, Nation attacker, Nation defender, War war) {
        return switch (type) {
            case "ground"    -> resolveGround(attacker, defender, war);
            case "airstrike" -> resolveAirstrike(attacker, defender, war);
            case "naval"     -> resolveNaval(attacker, defender, war);
            case "missile"   -> resolveMissile(attacker, defender);
            case "nuke"      -> resolveNuke(attacker, defender);
            default          -> WarAttack.builder().success(false).notes("Unknown attack type.");
        };
    }

    private WarAttack.WarAttackBuilder resolveGround(Nation atk, Nation def, War war) {
        WarAttack.WarAttackBuilder b = WarAttack.builder().attackType("ground");
        if (atk.getSoldiers() < 1 && atk.getTanks() < 1)
            return b.success(false).notes("No ground forces.");

        double atkStr = atk.getSoldiers() + atk.getTanks() * 40.0;
        double defStr = def.getSoldiers() + def.getTanks() * 40.0;

        double atkMult = "attacker".equals(war.getGroundControl()) ? 1.5 : 1.0;
        double defMult = "defender".equals(war.getGroundControl()) ? 1.5 : 1.0;
        if ("attacker".equals(war.getAirControl())) atkMult *= 1.25;
        if ("defender".equals(war.getAirControl())) defMult *= 1.25;

        double threshold = clamp(atkStr * atkMult / (atkStr * atkMult + defStr * defMult + 1), 0.1, 0.9);

        if (rng.nextDouble() <= threshold) {
            return b.success(true)
                .resistanceChange(15)
                .moneyLooted(Math.min(def.getMoney() * 0.05, 50000))
                .infraDestroyed(roll(10, 25))
                .attackerSoldierCasualties((long) (roll(0.005, 0.015) * atk.getSoldiers()))
                .attackerTankCasualties((long) (roll(0, 0.005) * atk.getTanks()))
                .defenderSoldierCasualties((long) (roll(0.01, 0.025) * def.getSoldiers()))
                .defenderTankCasualties((long) (roll(0.005, 0.015) * def.getTanks()));
        } else {
            return b.success(false).notes("Attack failed.")
                .attackerSoldierCasualties((long) (roll(0.01, 0.025) * atk.getSoldiers()))
                .attackerTankCasualties((long) (roll(0.005, 0.01) * atk.getTanks()))
                .defenderSoldierCasualties((long) (roll(0.003, 0.008) * def.getSoldiers()));
        }
    }

    private WarAttack.WarAttackBuilder resolveAirstrike(Nation atk, Nation def, War war) {
        WarAttack.WarAttackBuilder b = WarAttack.builder().attackType("airstrike");
        if (atk.getAircraft() < 1) return b.success(false).notes("No aircraft.");

        double atkStr = atk.getAircraft() * 3.0;
        double defStr = def.getAircraft() * 3.0;
        double atkMult = "attacker".equals(war.getAirControl()) ? 1.5 : ("defender".equals(war.getAirControl()) ? 0.75 : 1.0);
        double threshold = clamp(atkStr * atkMult / (atkStr * atkMult + defStr + 1), 0.1, 0.9);

        if (rng.nextDouble() <= threshold) {
            return b.success(true)
                .resistanceChange(12)
                .infraDestroyed(roll(5, 20))
                .moneyLooted(roll(1000, 10000))
                .attackerAircraftCasualties((long) (roll(0.005, 0.015) * atk.getAircraft()))
                .defenderAircraftCasualties((long) (roll(0.01, 0.03) * def.getAircraft()));
        } else {
            return b.success(false).notes("Airstrike failed.")
                .attackerAircraftCasualties((long) (roll(0.01, 0.03) * atk.getAircraft()))
                .defenderAircraftCasualties((long) (roll(0.002, 0.008) * def.getAircraft()));
        }
    }

    private WarAttack.WarAttackBuilder resolveNaval(Nation atk, Nation def, War war) {
        WarAttack.WarAttackBuilder b = WarAttack.builder().attackType("naval");
        if (atk.getShips() < 1) return b.success(false).notes("No ships.");

        double threshold = clamp((double) atk.getShips() / (atk.getShips() + def.getShips() + 1), 0.1, 0.9);

        if (rng.nextDouble() <= threshold) {
            return b.success(true)
                .resistanceChange(12)
                .infraDestroyed(roll(5, 15))
                .moneyLooted(roll(1000, 20000))
                .attackerShipCasualties((long) (roll(0.005, 0.015) * atk.getShips()))
                .defenderShipCasualties((long) (roll(0.01, 0.03) * def.getShips()));
        } else {
            return b.success(false).notes("Naval attack failed.")
                .attackerShipCasualties((long) (roll(0.01, 0.025) * atk.getShips()));
        }
    }

    private WarAttack.WarAttackBuilder resolveMissile(Nation atk, Nation def) {
        WarAttack.WarAttackBuilder b = WarAttack.builder().attackType("missile");
        if (atk.getMissiles() < 1) return b.success(false).notes("No missiles.");
        return b.success(true).resistanceChange(20)
            .infraDestroyed(roll(100, 250))
            .defenderSoldierCasualties((long) roll(100, 500));
    }

    private WarAttack.WarAttackBuilder resolveNuke(Nation atk, Nation def) {
        WarAttack.WarAttackBuilder b = WarAttack.builder().attackType("nuke");
        if (atk.getNukes() < 1) return b.success(false).notes("No nuclear weapons.");
        return b.success(true).resistanceChange(40)
            .infraDestroyed(roll(500, 1500))
            .moneyLooted(roll(50000, 200000))
            .defenderSoldierCasualties((long) roll(1000, 5000));
    }

    public String determineOutcome(int attackerResistance, int defenderResistance) {
        if (defenderResistance <= 0) return "attacker_victory";
        if (attackerResistance <= 0) return "defender_victory";
        return null;
    }
}
