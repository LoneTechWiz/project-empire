package com.empire.repository;

import com.empire.model.Nation;
import com.empire.model.TradeOffer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TradeOfferRepository extends JpaRepository<TradeOffer, Long> {
    List<TradeOffer> findByActiveTrue();
    List<TradeOffer> findByActiveTrueAndResource(String resource);
    List<TradeOffer> findByActiveTrueAndOfferType(String offerType);
    List<TradeOffer> findByActiveTrueAndResourceAndOfferType(String resource, String offerType);
    List<TradeOffer> findByNationAndActiveTrue(Nation nation);
}
