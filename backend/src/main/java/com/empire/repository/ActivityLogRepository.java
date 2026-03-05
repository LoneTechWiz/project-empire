package com.empire.repository;

import com.empire.model.ActivityLog;
import com.empire.model.Nation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
    List<ActivityLog> findTop10ByNationOrderByCreatedAtDesc(Nation nation);

    @Query("SELECT a FROM ActivityLog a JOIN FETCH a.nation ORDER BY a.createdAt DESC LIMIT 20")
    List<ActivityLog> findRecentGlobal();
}
