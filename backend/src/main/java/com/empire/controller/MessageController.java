package com.empire.controller;

import com.empire.dto.ApiResponse;
import com.empire.model.*;
import com.empire.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

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
        List<Message> all = messageRepo.findBySenderOrReceiverOrderBySentAtAsc(nation, nation);

        // Group by conversationId (legacy messages without one use their own id)
        Map<Long, List<Message>> byConv = new LinkedHashMap<>();
        for (Message m : all) {
            Long cid = m.getConversationId() != null ? m.getConversationId() : m.getId();
            byConv.computeIfAbsent(cid, k -> new ArrayList<>()).add(m);
        }

        // Build conversation summaries sorted by latest message desc
        List<Map<String, Object>> conversations = byConv.entrySet().stream()
            .map(e -> {
                List<Message> msgs = e.getValue();
                Message latest = msgs.get(msgs.size() - 1);
                long unread = msgs.stream()
                    .filter(m -> !m.isRead() && m.getReceiver().getId().equals(nation.getId()))
                    .count();
                Nation other = latest.getSender().getId().equals(nation.getId())
                    ? latest.getReceiver() : latest.getSender();
                Map<String, Object> conv = new HashMap<>();
                conv.put("conversationId", e.getKey());
                conv.put("subject", msgs.get(0).getSubject());
                conv.put("otherParty", other);
                conv.put("latestMessage", latest);
                conv.put("messageCount", msgs.size());
                conv.put("unread", unread);
                return conv;
            })
            .sorted((a, b) -> {
                Message la = (Message) a.get("latestMessage");
                Message lb = (Message) b.get("latestMessage");
                return lb.getSentAt().compareTo(la.getSentAt());
            })
            .collect(Collectors.toList());

        long totalUnread = messageRepo.countByReceiverAndReadFalse(nation);
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
            "conversations", conversations,
            "unread", totalUnread
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

        // If replying to an existing conversation, inherit its conversationId
        Long conversationId = null;
        if (body.get("conversationId") != null) {
            conversationId = Long.parseLong(body.get("conversationId").toString());
        }

        Message msg = messageRepo.save(Message.builder()
            .sender(sender).receiver(receiver)
            .subject(subject).content(content)
            .conversationId(conversationId)
            .build());

        // New conversation: set conversationId = its own id
        if (conversationId == null) {
            msg.setConversationId(msg.getId());
            messageRepo.save(msg);
        }

        return ResponseEntity.ok(ApiResponse.ok(msg));
    }

    /** Returns the full conversation thread containing the given message id. */
    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable Long id,
                                 @AuthenticationPrincipal UserDetails ud) {
        Nation nation = requireNation(ud);
        Message msg = messageRepo.findById(id).orElse(null);
        if (msg == null) return ResponseEntity.notFound().build();

        // If legacy message has no conversationId, self-assign and persist it
        if (msg.getConversationId() == null) {
            msg.setConversationId(msg.getId());
            messageRepo.save(msg);
        }
        Long cid = msg.getConversationId();
        List<Message> thread = messageRepo.findByConversationIdOrderBySentAtAsc(cid);
        if (thread.isEmpty()) thread = List.of(msg);

        // Check access — nation must be a participant
        boolean isParticipant = thread.stream().anyMatch(m ->
            m.getSender().getId().equals(nation.getId()) ||
            m.getReceiver().getId().equals(nation.getId()));
        if (!isParticipant) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden."));

        // Mark all unread messages addressed to this nation as read
        thread.stream()
            .filter(m -> !m.isRead() && m.getReceiver().getId().equals(nation.getId()))
            .forEach(m -> { m.setRead(true); messageRepo.save(m); });

        Nation other = thread.get(0).getSender().getId().equals(nation.getId())
            ? thread.get(0).getReceiver() : thread.get(0).getSender();

        return ResponseEntity.ok(ApiResponse.ok(Map.of(
            "conversationId", cid,
            "subject", thread.get(0).getSubject(),
            "otherParty", other,
            "messages", thread
        )));
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
        // Delete entire conversation
        Long cid = msg.getConversationId() != null ? msg.getConversationId() : id;
        messageRepo.deleteAll(messageRepo.findByConversationIdOrderBySentAtAsc(cid));
        return ResponseEntity.ok(ApiResponse.ok("Deleted."));
    }

    private ResponseEntity<?> fail(String msg) {
        return ResponseEntity.badRequest().body(ApiResponse.error(msg));
    }
}
