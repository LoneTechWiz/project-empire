package com.empire.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "trade_offers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TradeOffer {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "nation_id", nullable = false)
    @JsonIgnoreProperties({"cities", "alliance", "hibernateLazyInitializer"})
    private Nation nation;

    @Column(nullable = false)
    private String resource;

    private double quantity;
    private double pricePerUnit;

    @Column(nullable = false)
    private String offerType; // buy, sell

    @CreationTimestamp
    private LocalDateTime createdAt;

    @Builder.Default
    private boolean active = true;
}
