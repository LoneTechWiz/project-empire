package com.empire.repository;

import com.empire.model.Alliance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface AllianceRepository extends JpaRepository<Alliance, Long> {
    boolean existsByName(String name);
    boolean existsByAcronym(String acronym);
    List<Alliance> findByNameContainingIgnoreCase(String name);

    @Query("""
        SELECT a FROM Alliance a
        LEFT JOIN Nation n ON n.alliance = a AND n.alliancePosition != 'Applicant'
        GROUP BY a.id
        ORDER BY COUNT(n.id) DESC
        """)
    List<Alliance> findAllOrderByMemberCountDesc();
}
