package com.empire.repository;

import com.empire.model.Message;
import com.empire.model.Nation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByReceiverOrderBySentAtDesc(Nation receiver);
    List<Message> findBySenderOrderBySentAtDesc(Nation sender);
    long countByReceiverAndReadFalse(Nation receiver);
    List<Message> findBySenderOrReceiverOrderBySentAtAsc(Nation sender, Nation receiver);
    List<Message> findByConversationIdOrderBySentAtAsc(Long conversationId);
    long countByConversationIdAndReceiverAndReadFalse(Long conversationId, Nation receiver);
}
