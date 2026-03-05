package com.empire.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "war_attacks")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WarAttack {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "war_id", nullable = false)
    @JsonIgnore
    private War war;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "attacker_id", nullable = false)
    @JsonIgnoreProperties({"cities", "alliance", "hibernateLazyInitializer"})
    private Nation attacker;

    @Column(nullable = false)
    private String attackType;

    @CreationTimestamp
    private LocalDateTime date;

    @Builder.Default private boolean success = false;
    @Builder.Default private long attackerSoldierCasualties = 0;
    @Builder.Default private long attackerTankCasualties = 0;
    @Builder.Default private long attackerAircraftCasualties = 0;
    @Builder.Default private long attackerShipCasualties = 0;
    @Builder.Default private long defenderSoldierCasualties = 0;
    @Builder.Default private long defenderTankCasualties = 0;
    @Builder.Default private long defenderAircraftCasualties = 0;
    @Builder.Default private long defenderShipCasualties = 0;
    @Builder.Default private double infraDestroyed = 0;
    @Builder.Default private double moneyLooted = 0;
    @Builder.Default private int resistanceChange = 0;
    @Builder.Default private String notes = "";
}
