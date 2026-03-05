package com.empire.controller;

import com.empire.dto.ApiResponse;
import com.empire.model.*;
import com.empire.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageRepository messageRepo;
    private final NationRepository nationRepo;
    private final UserRepository userRepo;

    private Nation requireNation(UserDetails ud) {
        User user = userRepo.findByUsername(ud.getUsername()).orElseThrow();
        return nationRepo.findByUser(user).orElseThrow();
    }

    @GetMapping
    public ResponseEntity<?> inbox(@AuthenticationPrincipal UserDetails ud) {
        Nation nation = requireNation(ud);
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
            "inbox",   messageRepo.findByReceiverOrderBySentAtDesc(nation),
            "sent",    messageRepo.findBySenderOrderBySentAtDesc(nation),
            "unread",  messageRepo.countByReceiverAndReadFalse(nation)
        )));
    }

    @PostMapping
    public ResponseEntity<?> send(@RequestBody Map<String, Object> body,
                                  @AuthenticationPrincipal UserDetails ud) {
        Nation sender = requireNation(ud);
        Long receiverId = Long.parseLong(body.get("receiverId").toString());
        String subject = (String) body.getOrDefault("subject", "(no subject)");
        String content = (String) body.get("content");
        if (content == null || content.isBlank()) return fail("Message content required.");

        Nation receiver = nationRepo.findById(receiverId).orElse(null);
        if (receiver == null) return fail("Recipient not found.");
        if (receiver.getId().equals(sender.getId())) return fail("Cannot message yourself.");

        Message msg = messageRepo.save(Message.builder()
            .sender(sender).receiver(receiver)
            .subject(subject).content(content).build());
        return ResponseEntity.ok(ApiResponse.ok(msg));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable Long id,
                                 @AuthenticationPrincipal UserDetails ud) {
        Nation nation = requireNation(ud);
        Message msg = messageRepo.findById(id).orElse(null);
        if (msg == null) return ResponseEntity.notFound().build();
        boolean isSender   = msg.getSender().getId().equals(nation.getId());
        boolean isReceiver = msg.getReceiver().getId().equals(nation.getId());
        if (!isSender && !isReceiver) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden."));

        if (isReceiver && !msg.isRead()) {
            msg.setRead(true);
            messageRepo.save(msg);
        }
        return ResponseEntity.ok(ApiResponse.ok(msg));
    }

    @PostMapping("/{id}/delete")
    public ResponseEntity<?> delete(@PathVariable Long id,
                                    @AuthenticationPrincipal UserDetails ud) {
        Nation nation = requireNation(ud);
        Message msg = messageRepo.findById(id).orElse(null);
        if (msg == null) return ResponseEntity.notFound().build();
        if (!msg.getSender().getId().equals(nation.getId())
            && !msg.getReceiver().getId().equals(nation.getId()))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden."));
        messageRepo.delete(msg);
        return ResponseEntity.ok(ApiResponse.ok("Deleted."));
    }

    private ResponseEntity<?> fail(String msg) {
        return ResponseEntity.badRequest().body(ApiResponse.error(msg));
    }
}
