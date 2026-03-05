package com.empire.controller;

import com.empire.dto.ApiResponse;
import com.empire.model.*;
import com.empire.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/alliances")
@RequiredArgsConstructor
public class AllianceController {

    private final AllianceRepository allianceRepo;
    private final NationRepository nationRepo;
    private final UserRepository userRepo;

    private Nation requireNation(UserDetails ud) {
        User user = userRepo.findByUsername(ud.getUsername()).orElseThrow();
        return nationRepo.findByUser(user).orElseThrow();
    }

    private boolean isOfficer(Nation n, Alliance a) {
        return a.getId().equals(n.getAlliance() != null ? n.getAlliance().getId() : null)
            && List.of("Leader", "Heir", "Officer").contains(n.getAlliancePosition());
    }

    @GetMapping
    public ResponseEntity<?> list() {
        List<Alliance> alliances = allianceRepo.findAll();
        List<Map<String, Object>> result = alliances.stream().map(a -> {
            long memberCount = nationRepo.findAll().stream()
                .filter(n -> n.getAlliance() != null && n.getAlliance().getId().equals(a.getId())
                    && !"Applicant".equals(n.getAlliancePosition())).count();
            return Map.of("alliance", (Object) a, "memberCount", memberCount);
        }).sorted((x, y) -> Long.compare((Long) y.get("memberCount"), (Long) x.get("memberCount"))).toList();
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable Long id) {
        Alliance a = allianceRepo.findById(id).orElse(null);
        if (a == null) return ResponseEntity.notFound().build();
        List<Nation> members = nationRepo.findAll().stream()
            .filter(n -> n.getAlliance() != null && n.getAlliance().getId().equals(id)
                && !"Applicant".equals(n.getAlliancePosition()))
            .sorted((x, y) -> Double.compare(y.getScore(), x.getScore())).toList();
        List<Nation> applicants = nationRepo.findAll().stream()
            .filter(n -> n.getAlliance() != null && n.getAlliance().getId().equals(id)
                && "Applicant".equals(n.getAlliancePosition())).toList();
        double totalScore = members.stream().mapToDouble(Nation::getScore).sum();
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
            "alliance", a, "members", members, "applicants", applicants, "totalScore", totalScore
        )));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, String> body,
                                    @AuthenticationPrincipal UserDetails ud) {
        Nation nation = requireNation(ud);
        if (nation.getAlliance() != null) return fail("Already in an alliance.");
        String name = body.get("name"), acronym = body.get("acronym");
        if (name == null || acronym == null) return fail("Name and acronym required.");
        if (allianceRepo.existsByName(name)) return fail("Alliance name taken.");
        if (allianceRepo.existsByAcronym(acronym)) return fail("Acronym taken.");

        Alliance a = allianceRepo.save(Alliance.builder()
            .name(name).acronym(acronym)
            .color(body.getOrDefault("color", "gray"))
            .description(body.getOrDefault("description", ""))
            .forumLink(body.getOrDefault("forumLink", ""))
            .discordLink(body.getOrDefault("discordLink", ""))
            .build());
        nation.setAlliance(a);
        nation.setAlliancePosition("Leader");
        nationRepo.save(nation);
        return ResponseEntity.ok(ApiResponse.ok(a));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, String> body,
                                    @AuthenticationPrincipal UserDetails ud) {
        Alliance a = allianceRepo.findById(id).orElse(null);
        if (a == null) return ResponseEntity.notFound().build();
        Nation nation = requireNation(ud);
        if (!isOfficer(nation, a) || !List.of("Leader","Heir").contains(nation.getAlliancePosition()))
            return fail("No permission.");
        if (body.containsKey("color")) a.setColor(body.get("color"));
        if (body.containsKey("description")) a.setDescription(body.get("description"));
        if (body.containsKey("forumLink")) a.setForumLink(body.get("forumLink"));
        if (body.containsKey("discordLink")) a.setDiscordLink(body.get("discordLink"));
        return ResponseEntity.ok(ApiResponse.ok(allianceRepo.save(a)));
    }

    @PostMapping("/{id}/apply")
    public ResponseEntity<?> apply(@PathVariable Long id, @AuthenticationPrincipal UserDetails ud) {
        Alliance a = allianceRepo.findById(id).orElse(null);
        if (a == null) return fail("Alliance not found.");
        Nation nation = requireNation(ud);
        if (nation.getAlliance() != null) return fail("Already in an alliance.");
        nation.setAlliance(a);
        nation.setAlliancePosition("Applicant");
        nationRepo.save(nation);
        return ResponseEntity.ok(ApiResponse.ok("Application submitted."));
    }

    @PostMapping("/{id}/leave")
    public ResponseEntity<?> leave(@PathVariable Long id, @AuthenticationPrincipal UserDetails ud) {
        Nation nation = requireNation(ud);
        if (nation.getAlliance() == null || !nation.getAlliance().getId().equals(id))
            return fail("Not in this alliance.");
        nation.setAlliance(null);
        nation.setAlliancePosition("None");
        nationRepo.save(nation);
        return ResponseEntity.ok(ApiResponse.ok("Left alliance."));
    }

    @PostMapping("/{id}/accept/{nationId}")
    public ResponseEntity<?> accept(@PathVariable Long id, @PathVariable Long nationId,
                                    @AuthenticationPrincipal UserDetails ud) {
        Alliance a = allianceRepo.findById(id).orElse(null);
        if (a == null) return fail("Not found.");
        Nation officer = requireNation(ud);
        if (!isOfficer(officer, a)) return fail("No permission.");
        Nation applicant = nationRepo.findById(nationId).orElse(null);
        if (applicant == null || applicant.getAlliance() == null
            || !applicant.getAlliance().getId().equals(id)) return fail("Applicant not found.");
        applicant.setAlliancePosition("Member");
        nationRepo.save(applicant);
        return ResponseEntity.ok(ApiResponse.ok("Accepted."));
    }

    @PostMapping("/{id}/reject/{nationId}")
    public ResponseEntity<?> reject(@PathVariable Long id, @PathVariable Long nationId,
                                    @AuthenticationPrincipal UserDetails ud) {
        Alliance a = allianceRepo.findById(id).orElse(null);
        if (a == null) return fail("Not found.");
        Nation officer = requireNation(ud);
        if (!isOfficer(officer, a)) return fail("No permission.");
        Nation applicant = nationRepo.findById(nationId).orElse(null);
        if (applicant == null) return fail("Not found.");
        applicant.setAlliance(null);
        applicant.setAlliancePosition("None");
        nationRepo.save(applicant);
        return ResponseEntity.ok(ApiResponse.ok("Rejected."));
    }

    @PostMapping("/{id}/bank/deposit")
    public ResponseEntity<?> deposit(@PathVariable Long id, @RequestBody Map<String, Double> body,
                                     @AuthenticationPrincipal UserDetails ud) {
        Alliance a = allianceRepo.findById(id).orElse(null);
        if (a == null) return fail("Not found.");
        Nation nation = requireNation(ud);
        if (nation.getAlliance() == null || !nation.getAlliance().getId().equals(id)
            || "Applicant".equals(nation.getAlliancePosition())) return fail("No permission.");

        transferToBank(nation, a, body);
        nationRepo.save(nation);
        allianceRepo.save(a);
        return ResponseEntity.ok(ApiResponse.ok("Deposited."));
    }

    @PostMapping("/{id}/bank/withdraw")
    public ResponseEntity<?> withdraw(@PathVariable Long id, @RequestBody Map<String, Object> body,
                                      @AuthenticationPrincipal UserDetails ud) {
        Alliance a = allianceRepo.findById(id).orElse(null);
        if (a == null) return fail("Not found.");
        Nation officer = requireNation(ud);
        if (!isOfficer(officer, a)) return fail("No permission.");

        Long targetId = Long.parseLong(body.getOrDefault("targetNationId", "0").toString());
        Nation target = nationRepo.findById(targetId).orElse(officer);
        if (target.getAlliance() == null || !target.getAlliance().getId().equals(id))
            return fail("Target not in alliance.");

        @SuppressWarnings("unchecked")
        Map<String, Double> resources = (Map<String, Double>) body.get("resources");
        if (resources != null) transferFromBank(a, target, resources);

        nationRepo.save(target);
        allianceRepo.save(a);
        return ResponseEntity.ok(ApiResponse.ok("Withdrawn."));
    }

    private void transferToBank(Nation n, Alliance a, Map<String, Double> amounts) {
        amounts.forEach((k, v) -> { if (v == null || v <= 0) return; switch (k) {
            case "money"     -> { if (n.getMoney() >= v)     { n.setMoney(n.getMoney()-v);         a.setBankMoney(a.getBankMoney()+v); } }
            case "food"      -> { if (n.getFood() >= v)      { n.setFood(n.getFood()-v);           a.setBankFood(a.getBankFood()+v); } }
            case "coal"      -> { if (n.getCoal() >= v)      { n.setCoal(n.getCoal()-v);           a.setBankCoal(a.getBankCoal()+v); } }
            case "oil"       -> { if (n.getOil() >= v)       { n.setOil(n.getOil()-v);             a.setBankOil(a.getBankOil()+v); } }
            case "steel"     -> { if (n.getSteel() >= v)     { n.setSteel(n.getSteel()-v);         a.setBankSteel(a.getBankSteel()+v); } }
            case "aluminum"  -> { if (n.getAluminum() >= v)  { n.setAluminum(n.getAluminum()-v);   a.setBankAluminum(a.getBankAluminum()+v); } }
        }});
    }

    private void transferFromBank(Alliance a, Nation n, Map<String, Double> amounts) {
        amounts.forEach((k, v) -> { if (v == null || v <= 0) return; switch (k) {
            case "money"     -> { if (a.getBankMoney() >= v)    { a.setBankMoney(a.getBankMoney()-v);       n.setMoney(n.getMoney()+v); } }
            case "food"      -> { if (a.getBankFood() >= v)     { a.setBankFood(a.getBankFood()-v);         n.setFood(n.getFood()+v); } }
            case "coal"      -> { if (a.getBankCoal() >= v)     { a.setBankCoal(a.getBankCoal()-v);         n.setCoal(n.getCoal()+v); } }
            case "oil"       -> { if (a.getBankOil() >= v)      { a.setBankOil(a.getBankOil()-v);           n.setOil(n.getOil()+v); } }
            case "steel"     -> { if (a.getBankSteel() >= v)    { a.setBankSteel(a.getBankSteel()-v);       n.setSteel(n.getSteel()+v); } }
            case "aluminum"  -> { if (a.getBankAluminum() >= v) { a.setBankAluminum(a.getBankAluminum()-v); n.setAluminum(n.getAluminum()+v); } }
        }});
    }

    private ResponseEntity<?> fail(String msg) {
        return ResponseEntity.badRequest().body(ApiResponse.error(msg));
    }
}
