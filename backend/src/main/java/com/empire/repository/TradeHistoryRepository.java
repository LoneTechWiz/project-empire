package com.empire.repository;

import com.empire.model.TradeHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;

public interface TradeHistoryRepository extends JpaRepository<TradeHistory, Long> {
    List<TradeHistory> findTop20ByOrderByDateDesc();

    @Query("SELECT AVG(t.pricePerUnit) FROM TradeHistory t WHERE t.resource = :resource AND t.date > :since")
    Double findAvgPriceByResourceSince(@Param("resource") String resource, @Param("since") LocalDateTime since);
}
