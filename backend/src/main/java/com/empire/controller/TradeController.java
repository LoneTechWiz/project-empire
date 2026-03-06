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

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/trade")
@RequiredArgsConstructor
public class TradeController {

    private final TradeOfferRepository offerRepo;
    private final TradeHistoryRepository historyRepo;
    private final NationRepository nationRepo;
    private final UserRepository userRepo;
    private final MessageRepository messageRepo;

    private Nation requireNation(UserDetails ud) {
        User user = userRepo.findByUsername(ud.getUsername()).orElseThrow();
        return nationRepo.findByUser(user).orElseThrow();
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestParam(required = false) String resource,
                                  @RequestParam(required = false) String type) {
        List<TradeOffer> offers;
        if (resource != null && type != null) offers = offerRepo.findByActiveTrueAndResourceAndOfferType(resource, type);
        else if (resource != null) offers = offerRepo.findByActiveTrueAndResource(resource);
        else if (type != null) offers = offerRepo.findByActiveTrueAndOfferType(type);
        else offers = offerRepo.findByActiveTrue();

        Map<String, Double> marketPrices = new HashMap<>();
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
        for (String r : EconomyEngine.RESOURCES) {
            Double avg = historyRepo.findAvgPriceByResourceSince(r, sevenDaysAgo);
            marketPrices.put(r, avg != null ? avg : EconomyEngine.BASE_PRICES.getOrDefault(r, 0.0));
        }

        return ResponseEntity.ok(ApiResponse.ok(Map.of(
            "offers", offers,
            "recentTrades", historyRepo.findTop20ByOrderByDateDesc(),
            "marketPrices", marketPrices,
            "basePrices", EconomyEngine.BASE_PRICES,
            "resources", EconomyEngine.RESOURCES
        )));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body,
                                    @AuthenticationPrincipal UserDetails ud) {
        Nation nation = requireNation(ud);
        String resource = (String) body.get("resource");
        double quantity = Double.parseDouble(body.get("quantity").toString());
        double price = Double.parseDouble(body.get("pricePerUnit").toString());
        String offerType = (String) body.get("offerType");

        if (!EconomyEngine.RESOURCES.contains(resource)) return fail("Invalid resource.");
        if (quantity <= 0 || price <= 0) return fail("Invalid quantity or price.");
        if (!List.of("buy", "sell").contains(offerType)) return fail("Invalid offer type.");

        Nation fresh = nationRepo.findById(nation.getId()).orElseThrow();
        if ("sell".equals(offerType)) {
            double stock = getStock(fresh, resource);
            if (stock < quantity) return fail("Not enough " + resource + ".");
            deductStock(fresh, resource, quantity);
        } else {
            double total = quantity * price;
            if (fresh.getMoney() < total) return fail("Not enough money.");
            fresh.setMoney(fresh.getMoney() - total);
        }
        nationRepo.save(fresh);

        TradeOffer offer = offerRepo.save(TradeOffer.builder()
            .nation(fresh).resource(resource).quantity(quantity)
            .pricePerUnit(price).offerType(offerType).build());
        return ResponseEntity.ok(ApiResponse.ok(offer));
    }

    @PostMapping("/{id}/accept")
    public ResponseEntity<?> accept(@PathVariable Long id,
                                    @RequestBody(required = false) Map<String, Object> body,
                                    @AuthenticationPrincipal UserDetails ud) {
        TradeOffer offer = offerRepo.findById(id).orElse(null);
        if (offer == null || !offer.isActive()) return fail("Offer not found or expired.");

        Nation accepter = requireNation(ud);
        if (offer.getNation().getId().equals(accepter.getId())) return fail("Cannot accept your own offer.");

        // Determine fill quantity — defaults to full offer quantity
        double fillQty = offer.getQuantity();
        if (body != null && body.get("quantity") != null) {
            fillQty = Double.parseDouble(body.get("quantity").toString());
        }
        if (fillQty <= 0 || fillQty > offer.getQuantity())
            return fail("Invalid quantity.");

        Nation fresh = nationRepo.findById(accepter.getId()).orElseThrow();
        Nation poster = nationRepo.findById(offer.getNation().getId()).orElseThrow();
        double total = fillQty * offer.getPricePerUnit();

        if ("sell".equals(offer.getOfferType())) {
            if (fresh.getMoney() < total) return fail("Not enough money.");
            fresh.setMoney(fresh.getMoney() - total);
            addStock(fresh, offer.getResource(), fillQty);
            poster.setMoney(poster.getMoney() + total);
        } else {
            double stock = getStock(fresh, offer.getResource());
            if (stock < fillQty) return fail("Not enough " + offer.getResource() + ".");
            deductStock(fresh, offer.getResource(), fillQty);
            fresh.setMoney(fresh.getMoney() + total);
            addStock(poster, offer.getResource(), fillQty);
        }

        // Reduce remaining quantity; deactivate only if fully filled
        double remaining = offer.getQuantity() - fillQty;
        if (remaining < 0.001) {
            offer.setActive(false);
        } else {
            offer.setQuantity(remaining);
        }
        offerRepo.save(offer);
        nationRepo.save(fresh);
        nationRepo.save(poster);

        historyRepo.save(TradeHistory.builder()
            .buyer("sell".equals(offer.getOfferType()) ? fresh : poster)
            .seller("sell".equals(offer.getOfferType()) ? poster : fresh)
            .resource(offer.getResource()).quantity(fillQty)
            .pricePerUnit(offer.getPricePerUnit()).total(total).build());

        // Notify offer poster that their offer was filled
        String fillNote = remaining < 0.001 ? "Your offer has been fully filled." : "Your offer was partially filled — " + String.format("%.1f", remaining) + " units remain.";
        messageRepo.save(Message.builder()
            .sender(fresh).receiver(poster)
            .subject("Trade Offer Filled")
            .content(fresh.getName() + " filled " + String.format("%.1f", fillQty) + " " + offer.getResource() + " from your " + offer.getOfferType() + " offer at $" + String.format("%.2f", offer.getPricePerUnit()) + "/unit (total: $" + String.format("%.0f", total) + "). " + fillNote)
            .build());

        return ResponseEntity.ok(ApiResponse.ok("Trade completed."));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancel(@PathVariable Long id,
                                    @AuthenticationPrincipal UserDetails ud) {
        Nation nation = requireNation(ud);
        TradeOffer offer = offerRepo.findById(id).orElse(null);
        if (offer == null || !offer.isActive()) return fail("Not found.");
        if (!offer.getNation().getId().equals(nation.getId())) return fail("Not your offer.");

        Nation fresh = nationRepo.findById(nation.getId()).orElseThrow();
        if ("sell".equals(offer.getOfferType())) addStock(fresh, offer.getResource(), offer.getQuantity());
        else fresh.setMoney(fresh.getMoney() + offer.getQuantity() * offer.getPricePerUnit());

        offer.setActive(false);
        offerRepo.save(offer);
        nationRepo.save(fresh);
        return ResponseEntity.ok(ApiResponse.ok("Cancelled."));
    }

    private double getStock(Nation n, String r) { return switch (r) {
        case "food" -> n.getFood(); case "coal" -> n.getCoal(); case "oil" -> n.getOil();
        case "iron" -> n.getIron(); case "bauxite" -> n.getBauxite(); case "lead" -> n.getLead();
        case "uranium" -> n.getUranium(); case "gasoline" -> n.getGasoline();
        case "munitions" -> n.getMunitions(); case "steel" -> n.getSteel();
        case "aluminum" -> n.getAluminum(); default -> 0; }; }

    private void deductStock(Nation n, String r, double v) { switch (r) {
        case "food" -> n.setFood(n.getFood()-v); case "coal" -> n.setCoal(n.getCoal()-v);
        case "oil" -> n.setOil(n.getOil()-v); case "iron" -> n.setIron(n.getIron()-v);
        case "bauxite" -> n.setBauxite(n.getBauxite()-v); case "lead" -> n.setLead(n.getLead()-v);
        case "uranium" -> n.setUranium(n.getUranium()-v); case "gasoline" -> n.setGasoline(n.getGasoline()-v);
        case "munitions" -> n.setMunitions(n.getMunitions()-v); case "steel" -> n.setSteel(n.getSteel()-v);
        case "aluminum" -> n.setAluminum(n.getAluminum()-v); } }

    private void addStock(Nation n, String r, double v) { switch (r) {
        case "food" -> n.setFood(n.getFood()+v); case "coal" -> n.setCoal(n.getCoal()+v);
        case "oil" -> n.setOil(n.getOil()+v); case "iron" -> n.setIron(n.getIron()+v);
        case "bauxite" -> n.setBauxite(n.getBauxite()+v); case "lead" -> n.setLead(n.getLead()+v);
        case "uranium" -> n.setUranium(n.getUranium()+v); case "gasoline" -> n.setGasoline(n.getGasoline()+v);
        case "munitions" -> n.setMunitions(n.getMunitions()+v); case "steel" -> n.setSteel(n.getSteel()+v);
        case "aluminum" -> n.setAluminum(n.getAluminum()+v); } }

    private ResponseEntity<?> fail(String msg) { return ResponseEntity.badRequest().body(ApiResponse.error(msg)); }
}
