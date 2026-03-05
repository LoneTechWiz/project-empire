package com.empire.controller;

import com.empire.dto.ApiResponse;
import com.empire.dto.AuthRequest;
import com.empire.dto.AuthResponse;
import com.empire.dto.RegisterRequest;
import com.empire.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
        try {
            AuthResponse resp = authService.register(req);
            return ResponseEntity.ok(ApiResponse.ok(resp));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest req) {
        try {
            AuthResponse resp = authService.login(req.getUsername(), req.getPassword());
            return ResponseEntity.ok(ApiResponse.ok(resp));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@AuthenticationPrincipal UserDetails userDetails) {
        AuthResponse resp = authService.me(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(resp));
    }
}
