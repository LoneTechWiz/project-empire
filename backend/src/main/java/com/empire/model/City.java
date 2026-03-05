package com.empire.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "cities")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class City {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "nation_id", nullable = false)
    @JsonIgnore
    private Nation nation;

    @Column(nullable = false)
    private String name;

    @CreationTimestamp
    private LocalDateTime foundedDate;

    @Builder.Default private double infrastructure = 10;
    @Builder.Default private double land = 250;
    @Builder.Default private long population = 2000;

    // Power
    @Builder.Default private int impCoalpower = 0;
    @Builder.Default private int impOilpower = 0;
    @Builder.Default private int impNuclearpower = 0;
    @Builder.Default private int impWindpower = 0;

    // Mining/Farming
    @Builder.Default private int impCoalmine = 0;
    @Builder.Default private int impOilwell = 0;
    @Builder.Default private int impIronmine = 0;
    @Builder.Default private int impBauxitemine = 0;
    @Builder.Default private int impLeadmine = 0;
    @Builder.Default private int impUraniummine = 0;
    @Builder.Default private int impFarm = 0;

    // Industry
    @Builder.Default private int impOilrefinery = 0;
    @Builder.Default private int impSteelmill = 0;
    @Builder.Default private int impAluminumrefinery = 0;
    @Builder.Default private int impMunitionsfactory = 0;

    // Commerce
    @Builder.Default private int impPolicestation = 0;
    @Builder.Default private int impHospital = 0;
    @Builder.Default private int impRecyclingcenter = 0;
    @Builder.Default private int impSubway = 0;
    @Builder.Default private int impSupermarket = 0;
    @Builder.Default private int impBank = 0;
    @Builder.Default private int impMall = 0;
    @Builder.Default private int impStadium = 0;

    public Long getNationId() {
        return nation != null ? nation.getId() : null;
    }
}
