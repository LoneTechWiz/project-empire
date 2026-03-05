package com.empire.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "wars")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class War {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "attacker_id", nullable = false)
    @JsonIgnoreProperties({"cities", "alliance", "hibernateLazyInitializer"})
    private Nation attacker;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "defender_id", nullable = false)
    @JsonIgnoreProperties({"cities", "alliance", "hibernateLazyInitializer"})
    private Nation defender;

    @Builder.Default private String warType = "Ordinary";
    @Builder.Default private String reason = "";

    @CreationTimestamp
    private LocalDateTime startDate;

    private LocalDateTime endDate;

    @Builder.Default private String status = "active"; // active, peace, expired

    @Builder.Default private int attackerResistance = 100;
    @Builder.Default private int defenderResistance = 100;

    @Builder.Default private String groundControl = "none";
    @Builder.Default private String airControl = "none";
    @Builder.Default private String navalControl = "none";

    private Long peaceOfferedBy; // nation ID that offered peace, null if no offer pending

    @Builder.Default private double attackerInfraDestroyed = 0;
    @Builder.Default private double defenderInfraDestroyed = 0;
    @Builder.Default private double attackerMoneyLooted = 0;
    @Builder.Default private double defenderMoneyLooted = 0;

    @OneToMany(mappedBy = "war", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @JsonIgnore
    private List<WarAttack> attacks;
}
