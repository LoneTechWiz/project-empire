package com.empire.repository;

import com.empire.model.Alliance;
import com.empire.model.Treaty;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TreatyRepository extends JpaRepository<Treaty, Long> {
    List<Treaty> findByProposerOrReceiver(Alliance proposer, Alliance receiver);

    @Query("SELECT t FROM Treaty t WHERE t.status = 'active' AND t.type = :type AND ((t.proposer = :a1 AND t.receiver = :a2) OR (t.proposer = :a2 AND t.receiver = :a1))")
    java.util.Optional<Treaty> findActiveTreatyBetween(@Param("a1") Alliance a1, @Param("a2") Alliance a2, @Param("type") String type);
}
