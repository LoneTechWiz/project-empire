package com.empire.repository;

import com.empire.model.City;
import com.empire.model.Nation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CityRepository extends JpaRepository<City, Long> {
    List<City> findByNation(Nation nation);
    List<City> findByNation_Id(Long nationId);
    Optional<City> findByIdAndNation(Long id, Nation nation);
    long countByNation(Nation nation);
}
