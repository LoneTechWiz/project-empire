package com.empire.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "treaties")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Treaty {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proposer_id")
    @JsonIgnoreProperties({"members", "hibernateLazyInitializer", "handler", "roles"})
    private Alliance proposer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receiver_id")
    @JsonIgnoreProperties({"members", "hibernateLazyInitializer", "handler", "roles"})
    private Alliance receiver;

    // NAP, MDP, ODP, Trade Agreement, Protectorate, PIAT
    @Builder.Default
    private String type = "NAP";

    @Builder.Default
    @Column(columnDefinition = "TEXT")
    private String terms = "";

    @Builder.Default
    private String status = "pending"; // pending, active, cancelled, rejected

    @CreationTimestamp
    private LocalDateTime proposedDate;

    private LocalDateTime signedDate;
}
