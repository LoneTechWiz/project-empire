package com.empire.service;

import com.empire.dto.AuthResponse;
import com.empire.dto.RegisterRequest;
import com.empire.model.Nation;
import com.empire.model.User;
import com.empire.repository.NationRepository;
import com.empire.repository.UserRepository;
import com.empire.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepo;
    private final NationRepository nationRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (userRepo.existsByUsername(req.getUsername()))
            throw new IllegalArgumentException("Username already taken.");
        if (userRepo.existsByEmail(req.getEmail()))
            throw new IllegalArgumentException("Email already in use.");

        User user = userRepo.save(User.builder()
            .username(req.getUsername())
            .email(req.getEmail())
            .passwordHash(passwordEncoder.encode(req.getPassword()))
            .build());

        String token = jwtUtil.generateToken(user.getUsername());
        return new AuthResponse(token, user.getUsername(), user.getId(), null);
    }

    public AuthResponse login(String username, String rawPassword) {
        User user = userRepo.findByUsername(username)
            .orElseThrow(() -> new IllegalArgumentException("Invalid username or password."));
        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash()))
            throw new IllegalArgumentException("Invalid username or password.");

        user.setLastActive(java.time.LocalDateTime.now());
        userRepo.save(user);

        Nation nation = nationRepo.findByUser(user).orElse(null);
        String token = jwtUtil.generateToken(user.getUsername());
        return new AuthResponse(token, user.getUsername(), user.getId(), nation);
    }

    public AuthResponse me(String username) {
        User user = userRepo.findByUsername(username)
            .orElseThrow(() -> new IllegalArgumentException("User not found."));
        Nation nation = nationRepo.findByUser(user).orElse(null);
        String token = jwtUtil.generateToken(username);
        return new AuthResponse(token, username, user.getId(), nation);
    }
}
