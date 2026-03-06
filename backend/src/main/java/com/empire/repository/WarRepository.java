package com.empire.repository;

import com.empire.model.Nation;
import com.empire.model.War;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface WarRepository extends JpaRepository<War, Long> {
    List<War> findByAttackerAndStatus(Nation attacker, String status);
    List<War> findByDefenderAndStatus(Nation defender, String status);
    long countByAttackerAndStatus(Nation attacker, String status);
    long countByDefenderAndStatus(Nation defender, String status);
    long countByStatus(String status);

    @Query("SELECT w FROM War w WHERE (w.attacker = :nation OR w.defender = :nation) AND w.status != 'active' ORDER BY w.endDate DESC")
    List<War> findPastWars(@Param("nation") Nation nation);

    Optional<War> findByAttackerAndDefenderAndStatus(Nation attacker, Nation defender, String status);

    @Query("SELECT COUNT(w) FROM War w WHERE (w.attacker = :nation OR w.defender = :nation) AND w.status = 'active'")
    long countActiveWarsByNation(@Param("nation") Nation nation);
}
