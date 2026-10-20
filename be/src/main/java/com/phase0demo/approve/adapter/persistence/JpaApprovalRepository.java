package com.phase0demo.approve.adapter.persistence;

import com.phase0demo.approve.application.port.ApprovalRepository;
import com.phase0demo.approve.domain.Approval;
import com.phase0demo.approve.domain.ApprovalStatus;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class JpaApprovalRepository implements ApprovalRepository {
    private final Map<UUID, Approval> store = new ConcurrentHashMap<>();

    public JpaApprovalRepository() {
        UUID testId = UUID.fromString("00000000-0000-0000-0000-000000000001");
        store.put(testId, new Approval(
            testId,
            "requester1",
            ApprovalStatus.PENDING,
            null,
            null,
            Instant.now(),
            Instant.now()
        ));
    }

    @Override
    public Optional<Approval> findById(UUID id) {
        return Optional.ofNullable(store.get(id));
    }

    @Override
    public Approval save(Approval approval) {
        store.put(approval.getId(), approval);
        return approval;
    }
}
