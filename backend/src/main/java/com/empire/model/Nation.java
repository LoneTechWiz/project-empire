package com.empire.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "nations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Nation {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    @JsonIgnore
    private User user;

    @Column(unique = true, nullable = false, length = 40)
    private String name;

    @Column(nullable = false)
    private String leaderName;

    @Builder.Default private String flagUrl = "/img/default_flag.png";
    @Builder.Default private String continent = "North America";
    @Builder.Default private String color = "gray";
    @Builder.Default private String governmentType = "Republic";
    @Builder.Default private String religion = "None";
    @Builder.Default private String warPolicy = "Moderate";
    @Builder.Default private String domesticPolicy = "None";
    @Builder.Default private String capital = "";

    @CreationTimestamp
    private LocalDateTime foundedDate;

    @Builder.Default private double score = 0;

    // Resources
    @Builder.Default private double money = 500000;
    @Builder.Default private double food = 3000;
    @Builder.Default private double coal = 0;
    @Builder.Default private double oil = 0;
    @Builder.Default private double uranium = 0;
    @Builder.Default private double iron = 0;
    @Builder.Default private double bauxite = 0;
    @Builder.Default private double lead = 0;
    @Builder.Default private double gasoline = 0;
    @Builder.Default private double munitions = 0;
    @Builder.Default private double steel = 0;
    @Builder.Default private double aluminum = 0;

    // Military
    @Builder.Default private long soldiers = 0;
    @Builder.Default private long tanks = 0;
    @Builder.Default private long aircraft = 0;
    @Builder.Default private long ships = 0;
    @Builder.Default private long spies = 0;
    @Builder.Default private long missiles = 0;
    @Builder.Default private long nukes = 0;

    // Casualties
    @Builder.Default private long soldierCasualties = 0;
    @Builder.Default private long tankCasualties = 0;
    @Builder.Default private long aircraftCasualties = 0;
    @Builder.Default private long shipCasualties = 0;

    // War record
    @Builder.Default private int offensiveWarsWon = 0;
    @Builder.Default private int defensiveWarsWon = 0;
    @Builder.Default private int offensiveWarsLost = 0;
    @Builder.Default private int defensiveWarsLost = 0;

    @Builder.Default private int beigeTurns = 0;
    @Builder.Default private int turns = 10;
    @Builder.Default private boolean vacationMode = false;

    // Alliance
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "alliance_id")
    @JsonIgnoreProperties({"members", "hibernateLazyInitializer"})
    private Alliance alliance;

    @Builder.Default private String alliancePosition = "None";

    @Builder.Default
    @Column(columnDefinition = "TEXT")
    private String projects = "[]";

    @OneToMany(mappedBy = "nation", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @JsonIgnore
    private List<City> cities;

    // Convenience: username from user
    public String getUsername() {
        return user != null ? user.getUsername() : null;
    }

    public Long getUserId() {
        return user != null ? user.getId() : null;
    }
}
