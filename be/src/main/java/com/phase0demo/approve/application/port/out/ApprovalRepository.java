package com.phase0demo.approve.application.port.out;

import com.phase0demo.approve.domain.ApprovalRequest;
import java.util.Optional;
import java.util.UUID;

public interface ApprovalRepository {
    Optional<ApprovalRequest> findById(UUID id);
    ApprovalRequest save(ApprovalRequest approvalRequest);
}
