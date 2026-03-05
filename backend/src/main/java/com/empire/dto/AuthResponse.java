package com.empire.dto;

import com.empire.model.Nation;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private String username;
    private Long userId;
    private Nation nation; // null if no nation created yet
}
