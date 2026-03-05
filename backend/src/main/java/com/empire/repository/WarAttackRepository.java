package com.empire.repository;

import com.empire.model.Nation;
import com.empire.model.War;
import com.empire.model.WarAttack;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface WarAttackRepository extends JpaRepository<WarAttack, Long> {
    List<WarAttack> findByWarOrderByDateDesc(War war);
    long countByWarAndAttackerAndDateAfter(War war, Nation attacker, LocalDateTime after);
}
