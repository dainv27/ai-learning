package com.phase0demo.reject.application;

import com.phase0demo.reject.domain.model.Approval;
import com.phase0demo.reject.domain.model.ApprovalNotFoundException;
import com.phase0demo.reject.domain.port.ApprovalRepository;
import com.phase0demo.reject.domain.port.IdempotencyService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class RejectApprovalUseCase {
    private final ApprovalRepository approvalRepository;
    private final IdempotencyService idempotencyService;

    public RejectApprovalUseCase(ApprovalRepository approvalRepository, IdempotencyService idempotencyService) {
        this.approvalRepository = approvalRepository;
        this.idempotencyService = idempotencyService;
    }

    @Transactional
    public Approval execute(UUID approvalId, String userId, String comment, String idempotencyKey) {
        // Check idempotency: if this key was already used, return cached result
        var cached = approvalRepository.findByIdempotencyKey(idempotencyKey);
        if (cached.isPresent()) {
            return cached.get();
        }

        Approval approval = approvalRepository.findById(approvalId)
            .orElseThrow(() -> new ApprovalNotFoundException(approvalId));

        approval.reject(userId, comment);
        Approval saved = approvalRepository.save(approval);

        // Mark idempotency key as used
        idempotencyService.recordKey(idempotencyKey, saved.getId());

        return saved;
    }
}
