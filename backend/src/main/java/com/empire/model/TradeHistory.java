package com.empire.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "trade_history")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TradeHistory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "buyer_id")
    @JsonIgnoreProperties({"cities", "alliance", "hibernateLazyInitializer"})
    private Nation buyer;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "seller_id")
    @JsonIgnoreProperties({"cities", "alliance", "hibernateLazyInitializer"})
    private Nation seller;

    private String resource;
    private double quantity;
    private double pricePerUnit;
    private double total;

    @CreationTimestamp
    private LocalDateTime date;
}
