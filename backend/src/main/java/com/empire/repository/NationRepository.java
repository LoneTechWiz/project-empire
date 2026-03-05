package com.empire.repository;

import com.empire.model.Nation;
import com.empire.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface NationRepository extends JpaRepository<Nation, Long> {
    Optional<Nation> findByUser(User user);
    Optional<Nation> findByUser_Id(Long userId);
    boolean existsByName(String name);
    List<Nation> findByNameContainingIgnoreCaseOrLeaderNameContainingIgnoreCase(String name, String leaderName);

    @Query("SELECT n FROM Nation n ORDER BY n.score DESC")
    List<Nation> findAllOrderByScoreDesc();

    @Query("SELECT n FROM Nation n ORDER BY n.soldiers DESC")
    List<Nation> findAllOrderBySoldiersDesc();

    @Query("SELECT n FROM Nation n ORDER BY n.tanks DESC")
    List<Nation> findAllOrderByTanksDesc();

    @Query("SELECT n FROM Nation n ORDER BY n.aircraft DESC")
    List<Nation> findAllOrderByAircraftDesc();

    @Query("SELECT n FROM Nation n ORDER BY n.ships DESC")
    List<Nation> findAllOrderByShipsDesc();

    @Query("SELECT n FROM Nation n ORDER BY n.nukes DESC")
    List<Nation> findAllOrderByNukesDesc();

    long countByScoreGreaterThan(double score);
}
