package com.phase0demo.approve.application;

import com.phase0demo.approve.domain.Approval;
import com.phase0demo.approve.domain.ApprovalStatus;
import com.phase0demo.approve.application.port.ApprovalRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class ApprovalService {
    private final ApprovalRepository repository;
    private final IdempotencyService idempotencyService;

    public ApprovalService(ApprovalRepository repository, IdempotencyService idempotencyService) {
        this.repository = repository;
        this.idempotencyService = idempotencyService;
    }

    @Transactional
    public Approval approve(UUID approvalId, String approverId, String comment, String idempotencyKey) {
        if (idempotencyKey != null) {
            Approval cached = idempotencyService.checkIdempotency(idempotencyKey);
            if (cached != null) {
                return cached;
            }
        }

        Approval approval = repository.findById(approvalId)
            .orElseThrow(() -> new IllegalArgumentException("Approval not found: " + approvalId));
        
        approval.approve(approverId, comment);
        Approval saved = repository.save(approval);

        if (idempotencyKey != null) {
            idempotencyService.storeIdempotency(idempotencyKey, saved);
        }

        return saved;
    }

    @Transactional
    public Approval reject(UUID approvalId, String approverId, String comment, String idempotencyKey) {
        if (idempotencyKey != null) {
            Approval cached = idempotencyService.checkIdempotency(idempotencyKey);
            if (cached != null) {
                return cached;
            }
        }

        Approval approval = repository.findById(approvalId)
            .orElseThrow(() -> new IllegalArgumentException("Approval not found: " + approvalId));
        
        approval.reject(approverId, comment);
        Approval saved = repository.save(approval);

        if (idempotencyKey != null) {
            idempotencyService.storeIdempotency(idempotencyKey, saved);
        }

        return saved;
    }

    public Approval getApproval(UUID approvalId) {
        return repository.findById(approvalId)
            .orElseThrow(() -> new IllegalArgumentException("Approval not found: " + approvalId));
    }
}
