package com.empire.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "alliances")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Alliance {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 50)
    private String name;

    @Column(nullable = false, length = 8)
    private String acronym;

    @Builder.Default
    private String flagUrl = "/img/default_alliance_flag.png";

    @Builder.Default
    private String color = "gray";

    @Builder.Default
    @Column(columnDefinition = "TEXT")
    private String description = "";

    @Builder.Default
    private String forumLink = "";

    @Builder.Default
    private String discordLink = "";

    @Builder.Default
    @Column(columnDefinition = "TEXT")
    private String roles = "[]";

    @CreationTimestamp
    private LocalDateTime foundedDate;

    // Bank resources
    @Builder.Default private double bankMoney = 0;
    @Builder.Default private double bankFood = 0;
    @Builder.Default private double bankCoal = 0;
    @Builder.Default private double bankOil = 0;
    @Builder.Default private double bankUranium = 0;
    @Builder.Default private double bankIron = 0;
    @Builder.Default private double bankBauxite = 0;
    @Builder.Default private double bankLead = 0;
    @Builder.Default private double bankGasoline = 0;
    @Builder.Default private double bankMunitions = 0;
    @Builder.Default private double bankSteel = 0;
    @Builder.Default private double bankAluminum = 0;

    // Tax rate (0–50%): collected from each member's money income each tick
    @Builder.Default private int taxRate = 0;

    @OneToMany(mappedBy = "alliance", fetch = FetchType.LAZY)
    @JsonIgnore
    private List<Nation> members;
}
