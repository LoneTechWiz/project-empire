package com.empire.controller;

import com.empire.dto.ApiResponse;
import com.empire.game.WarEngine;
import com.empire.model.*;
import com.empire.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/wars")
@RequiredArgsConstructor
public class WarController {

    private final WarRepository warRepo;
    private final WarAttackRepository attackRepo;
    private final NationRepository nationRepo;
    private final UserRepository userRepo;
    private final CityRepository cityRepo;
    private final ActivityLogRepository activityLogRepo;
    private final WarEngine warEngine;
    private final MessageRepository messageRepo;
    private final TreatyRepository treatyRepo;

    private Nation requireNation(UserDetails ud) {
        User user = userRepo.findByUsername(ud.getUsername()).orElseThrow();
        return nationRepo.findByUser(user).orElseThrow();
    }

    @GetMapping
    public ResponseEntity<?> list(@AuthenticationPrincipal UserDetails ud) {
        Nation nation = requireNation(ud);
        List<War> offensive = warRepo.findByAttackerAndStatus(nation, "active");
        List<War> defensive = warRepo.findByDefenderAndStatus(nation, "active");
        LocalDateTime window = LocalDateTime.now().minusHours(6);
        Map<Long, Long> attacksUsed = new HashMap<>();
        Map<Long, Long> nextRegenAt = new HashMap<>();
        for (War w : offensive) {
            List<WarAttack> recent = attackRepo.findByWarAndAttackerAndDateAfterOrderByDateAsc(w, nation, window);
            attacksUsed.put(w.getId(), recent.stream().mapToLong(WarAttack::getChargesCost).sum());
            if (!recent.isEmpty()) nextRegenAt.put(w.getId(),
                recent.get(0).getDate().plusHours(6).toInstant(java.time.ZoneOffset.UTC).toEpochMilli());
        }
        for (War w : defensive) {
            List<WarAttack> recent = attackRepo.findByWarAndAttackerAndDateAfterOrderByDateAsc(w, nation, window);
            attacksUsed.put(w.getId(), recent.stream().mapToLong(WarAttack::getChargesCost).sum());
            if (!recent.isEmpty()) nextRegenAt.put(w.getId(),
                recent.get(0).getDate().plusHours(6).toInstant(java.time.ZoneOffset.UTC).toEpochMilli());
        }
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
            "offensive", offensive,
            "defensive", defensive,
            "past",      warRepo.findPastWars(nation),
            "attacksUsed", attacksUsed,
            "nextRegenAt", nextRegenAt
        )));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable Long id, @AuthenticationPrincipal UserDetails ud) {
        War war = warRepo.findById(id).orElse(null);
        if (war == null) return ResponseEntity.notFound().build();
        Nation nation = requireNation(ud);
        List<WarAttack> attacks = attackRepo.findByWarOrderByDateDesc(war);
        boolean isAttacker = war.getAttacker().getId().equals(nation.getId());
        boolean isDefender = war.getDefender().getId().equals(nation.getId());
        List<WarAttack> recentAttacks = attackRepo.findByWarAndAttackerAndDateAfterOrderByDateAsc(
            war, nation, LocalDateTime.now().minusHours(6));
        long attacksUsed = recentAttacks.stream().mapToLong(WarAttack::getChargesCost).sum();
        Long nextRegenAt = recentAttacks.isEmpty() ? null :
            recentAttacks.get(0).getDate().plusHours(6).toInstant(java.time.ZoneOffset.UTC).toEpochMilli();
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
            "war", war, "attacks", attacks,
            "isAttacker", isAttacker, "isDefender", isDefender,
            "attacksUsed", attacksUsed,
            "nextRegenAt", nextRegenAt != null ? nextRegenAt : 0L
        )));
    }

    @PostMapping("/declare/{targetId}")
    public ResponseEntity<?> declare(@PathVariable Long targetId,
                                     @RequestBody(required = false) Map<String, String> body,
                                     @AuthenticationPrincipal UserDetails ud) {
        Nation attacker = requireNation(ud);
        Nation defender = nationRepo.findById(targetId).orElse(null);
        if (defender == null) return fail("Nation not found.");
        if (defender.getId().equals(attacker.getId())) return fail("Cannot attack yourself.");
        if (defender.getBeigeTurns() > 0) return fail("Target is on beige protection.");
        if (attacker.getBeigeTurns() > 0) return fail("You are on beige protection.");

        if (warRepo.countActiveWarsByNation(attacker) >= 8)
            return fail("Max total wars reached (8).");
        if (warRepo.countByDefenderAndStatus(defender, "active") >= 3)
            return fail("Target has max defensive wars (3).");
        if (attacker.getAlliance() != null && defender.getAlliance() != null
                && treatyRepo.findActiveTreatyBetween(attacker.getAlliance(), defender.getAlliance(), "NAP").isPresent())
            return fail("Cannot declare war — your alliances have an active NAP treaty.");
        if (warRepo.findByAttackerAndDefenderAndStatus(attacker, defender, "active").isPresent())
            return fail("Already at war with this nation.");

        String reason = body != null ? body.getOrDefault("reason", "") : "";
        War war = warRepo.save(War.builder().attacker(attacker).defender(defender).reason(reason).build());

        activityLogRepo.save(ActivityLog.builder().nation(attacker)
            .message(attacker.getName() + " declared war on " + defender.getName() + ".").build());
        activityLogRepo.save(ActivityLog.builder().nation(defender)
            .message(attacker.getName() + " declared war on " + defender.getName() + ".").build());

        messageRepo.save(Message.builder()
            .sender(attacker)
            .receiver(defender)
            .subject("⚔️ War Declaration")
            .content(attacker.getName() + " has declared war on " + defender.getName() + "!\n\nReason: " + reason + "\n\nPrepare your defenses.")
            .build());

        return ResponseEntity.ok(ApiResponse.ok(war));
    }

    @PostMapping("/{id}/attack")
    public ResponseEntity<?> attack(@PathVariable Long id,
                                    @RequestBody Map<String, String> body,
                                    @AuthenticationPrincipal UserDetails ud) {
        War war = warRepo.findById(id).orElse(null);
        if (war == null || !"active".equals(war.getStatus())) return fail("War not active.");

        Nation attacker = requireNation(ud);
        boolean isAttacker = war.getAttacker().getId().equals(attacker.getId());
        boolean isDefender = war.getDefender().getId().equals(attacker.getId());
        if (!isAttacker && !isDefender) return fail("Not a participant.");

        String attackType = body.get("attackType");
        int chargeCost = switch (attackType) {
            case "nuke"      -> 4;
            case "airstrike", "naval", "missile" -> 2;
            default          -> 1;
        };

        List<WarAttack> recentAttacks = attackRepo.findByWarAndAttackerAndDateAfterOrderByDateAsc(
            war, attacker, LocalDateTime.now().minusHours(6));
        long chargesUsed = recentAttacks.stream().mapToLong(WarAttack::getChargesCost).sum();
        if (chargesUsed + chargeCost > 4) return fail("Not enough charges. Need " + chargeCost + ", have " + (4 - chargesUsed) + " remaining.");
        Nation defender = isAttacker ? war.getDefender() : war.getAttacker();
        Nation freshAttacker = nationRepo.findById(attacker.getId()).orElseThrow();
        Nation freshDefender = nationRepo.findById(defender.getId()).orElseThrow();

        WarAttack attack = warEngine.resolveAttack(attackType, freshAttacker, freshDefender, war)
            .war(war).attacker(freshAttacker).chargesCost(chargeCost).build();

        attackRepo.save(attack);

        if (attack.isSuccess()) {
            // Update battlefield control
            String controller = isAttacker ? "attacker" : "defender";
            switch (attackType) {
                case "ground"    -> war.setGroundControl(controller);
                case "airstrike" -> war.setAirControl(controller);
                case "naval"     -> war.setNavalControl(controller);
            }

            // Apply attacker casualties
            freshAttacker.setSoldiers(Math.max(0, freshAttacker.getSoldiers() - attack.getAttackerSoldierCasualties()));
            freshAttacker.setTanks(Math.max(0, freshAttacker.getTanks() - attack.getAttackerTankCasualties()));
            freshAttacker.setAircraft(Math.max(0, freshAttacker.getAircraft() - attack.getAttackerAircraftCasualties()));
            freshAttacker.setShips(Math.max(0, freshAttacker.getShips() - attack.getAttackerShipCasualties()));
            freshAttacker.setSoldierCasualties(freshAttacker.getSoldierCasualties() + attack.getAttackerSoldierCasualties());

            // Apply defender casualties
            freshDefender.setSoldiers(Math.max(0, freshDefender.getSoldiers() - attack.getDefenderSoldierCasualties()));
            freshDefender.setTanks(Math.max(0, freshDefender.getTanks() - attack.getDefenderTankCasualties()));
            freshDefender.setAircraft(Math.max(0, freshDefender.getAircraft() - attack.getDefenderAircraftCasualties()));
            freshDefender.setShips(Math.max(0, freshDefender.getShips() - attack.getDefenderShipCasualties()));
            freshDefender.setSoldierCasualties(freshDefender.getSoldierCasualties() + attack.getDefenderSoldierCasualties());

            // Loot and infra
            if (attack.getMoneyLooted() > 0) {
                freshDefender.setMoney(Math.max(0, freshDefender.getMoney() - attack.getMoneyLooted()));
                freshAttacker.setMoney(freshAttacker.getMoney() + attack.getMoneyLooted());
            }
            if (attack.getInfraDestroyed() > 0) {
                List<City> defCities = cityRepo.findByNation(freshDefender);
                if (!defCities.isEmpty()) {
                    City target = defCities.get(new Random().nextInt(defCities.size()));
                    target.setInfrastructure(Math.max(0, target.getInfrastructure() - attack.getInfraDestroyed()));
                    cityRepo.save(target);
                }
            }

            // Update resistance
            if (isAttacker) war.setDefenderResistance(Math.max(0, war.getDefenderResistance() - attack.getResistanceChange()));
            else war.setAttackerResistance(Math.max(0, war.getAttackerResistance() - attack.getResistanceChange()));

            // Check end
            String outcome = warEngine.determineOutcome(war.getAttackerResistance(), war.getDefenderResistance());
            if (outcome != null) {
                war.setStatus("peace");
                war.setEndDate(LocalDateTime.now());
                Nation winner = "attacker_victory".equals(outcome) ? freshAttacker : freshDefender;
                Nation loser  = "attacker_victory".equals(outcome) ? freshDefender : freshAttacker;
                if ("attacker_victory".equals(outcome)) {
                    freshAttacker.setOffensiveWarsWon(freshAttacker.getOffensiveWarsWon() + 1);
                    freshDefender.setDefensiveWarsLost(freshDefender.getDefensiveWarsLost() + 1);
                    freshDefender.setBeigeTurns(72);
                } else {
                    freshDefender.setDefensiveWarsWon(freshDefender.getDefensiveWarsWon() + 1);
                    freshAttacker.setOffensiveWarsLost(freshAttacker.getOffensiveWarsLost() + 1);
                    freshAttacker.setBeigeTurns(72);
                }
                activityLogRepo.save(ActivityLog.builder().nation(winner)
                    .message("Won war! (War #" + war.getId() + ")").build());
                activityLogRepo.save(ActivityLog.builder().nation(loser)
                    .message("Lost war. (War #" + war.getId() + ")").build());
                messageRepo.save(Message.builder().sender(winner).receiver(winner)
                    .subject("War #" + war.getId() + " — Victory")
                    .content("Your war against " + loser.getName() + " has ended in your victory.")
                    .build());
                messageRepo.save(Message.builder().sender(loser).receiver(loser)
                    .subject("War #" + war.getId() + " — Defeat")
                    .content("Your war against " + winner.getName() + " has ended in defeat. You have been placed on beige protection.")
                    .build());
            }
        } else {
            // Failed: attacker still takes some casualties
            freshAttacker.setSoldiers(Math.max(0, freshAttacker.getSoldiers() - attack.getAttackerSoldierCasualties()));
            freshAttacker.setTanks(Math.max(0, freshAttacker.getTanks() - attack.getAttackerTankCasualties()));
            freshAttacker.setAircraft(Math.max(0, freshAttacker.getAircraft() - attack.getAttackerAircraftCasualties()));
            freshAttacker.setShips(Math.max(0, freshAttacker.getShips() - attack.getAttackerShipCasualties()));
            freshAttacker.setSoldierCasualties(freshAttacker.getSoldierCasualties() + attack.getAttackerSoldierCasualties());
            // Defender also takes casualties repelling the attack
            freshDefender.setSoldiers(Math.max(0, freshDefender.getSoldiers() - attack.getDefenderSoldierCasualties()));
            freshDefender.setAircraft(Math.max(0, freshDefender.getAircraft() - attack.getDefenderAircraftCasualties()));
            freshDefender.setSoldierCasualties(freshDefender.getSoldierCasualties() + attack.getDefenderSoldierCasualties());
        }

        // Missiles and nukes are consumed on use regardless of success
        if ("missile".equals(attackType)) freshAttacker.setMissiles(Math.max(0, freshAttacker.getMissiles() - 1));
        if ("nuke".equals(attackType)) freshAttacker.setNukes(Math.max(0, freshAttacker.getNukes() - 1));

        nationRepo.save(freshAttacker);
        nationRepo.save(freshDefender);
        warRepo.save(war);

        return ResponseEntity.ok(ApiResponse.ok(Map.of("attack", attack, "war", warRepo.findById(id).orElseThrow())));
    }

    @PostMapping("/{id}/peace")
    public ResponseEntity<?> peace(@PathVariable Long id,
                                   @AuthenticationPrincipal UserDetails ud) {
        War war = warRepo.findById(id).orElse(null);
        if (war == null || !"active".equals(war.getStatus())) return fail("War not active.");
        Nation nation = requireNation(ud);
        boolean isAttacker = war.getAttacker().getId().equals(nation.getId());
        boolean isDefender = war.getDefender().getId().equals(nation.getId());
        if (!isAttacker && !isDefender) return fail("Not a participant.");

        Long offeredBy = war.getPeaceOfferedBy();
        Nation opponent = isAttacker ? war.getDefender() : war.getAttacker();

        if (offeredBy == null) {
            // No offer yet — make one
            war.setPeaceOfferedBy(nation.getId());
            warRepo.save(war);
            messageRepo.save(Message.builder()
                .sender(nation).receiver(opponent)
                .subject("🕊 Peace Offer")
                .content(nation.getName() + " has offered peace in War #" + war.getId() + ". Go to the war page to accept or decline.")
                .build());
            return ResponseEntity.ok(ApiResponse.ok("Peace offer sent."));
        } else if (offeredBy.equals(nation.getId())) {
            // Withdraw your own offer
            war.setPeaceOfferedBy(null);
            warRepo.save(war);
            return ResponseEntity.ok(ApiResponse.ok("Peace offer withdrawn."));
        } else {
            // Opponent offered — accept it
            war.setStatus("peace");
            war.setEndDate(LocalDateTime.now());
            war.setPeaceOfferedBy(null);
            warRepo.save(war);
            messageRepo.save(Message.builder()
                .sender(nation).receiver(opponent)
                .subject("🕊 Peace Accepted")
                .content(nation.getName() + " has accepted your peace offer. War #" + war.getId() + " is over.")
                .build());
            return ResponseEntity.ok(ApiResponse.ok("Peace accepted."));
        }
    }

    @PostMapping("/{id}/peace/decline")
    public ResponseEntity<?> declinePeace(@PathVariable Long id,
                                          @AuthenticationPrincipal UserDetails ud) {
        War war = warRepo.findById(id).orElse(null);
        if (war == null || !"active".equals(war.getStatus())) return fail("War not active.");
        Nation nation = requireNation(ud);
        boolean isAttacker = war.getAttacker().getId().equals(nation.getId());
        boolean isDefender = war.getDefender().getId().equals(nation.getId());
        if (!isAttacker && !isDefender) return fail("Not a participant.");
        if (war.getPeaceOfferedBy() == null || war.getPeaceOfferedBy().equals(nation.getId()))
            return fail("No incoming peace offer to decline.");

        Nation opponent = isAttacker ? war.getDefender() : war.getAttacker();
        war.setPeaceOfferedBy(null);
        warRepo.save(war);
        messageRepo.save(Message.builder()
            .sender(nation).receiver(opponent)
            .subject("🕊 Peace Declined")
            .content(nation.getName() + " has declined your peace offer in War #" + war.getId() + ".")
            .build());
        return ResponseEntity.ok(ApiResponse.ok("Peace offer declined."));
    }

    private ResponseEntity<?> fail(String msg) {
        return ResponseEntity.badRequest().body(ApiResponse.error(msg));
    }
}
