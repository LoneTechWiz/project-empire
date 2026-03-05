package com.empire.repository;

import com.empire.model.Alliance;
import com.empire.model.Treaty;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TreatyRepository extends JpaRepository<Treaty, Long> {
    List<Treaty> findByProposerOrReceiver(Alliance proposer, Alliance receiver);
}
