package com.phase0demo.approve.application;

import com.phase0demo.approve.domain.Approval;
import com.phase0demo.approve.domain.ApprovalStatus;
import com.phase0demo.approve.domain.IdempotencyKey;
import com.phase0demo.approve.repository.ApprovalRepository;
import com.phase0demo.approve.repository.IdempotencyKeyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ApprovalService {

    private final ApprovalRepository approvalRepository;
    private final IdempotencyKeyRepository idempotencyKeyRepository;

    public ApprovalService(ApprovalRepository approvalRepository, IdempotencyKeyRepository idempotencyKeyRepository) {
        this.approvalRepository = approvalRepository;
        this.idempotencyKeyRepository = idempotencyKeyRepository;
    }

    @Transactional
    public Approval createApproval(String resourceType, String resourceId, String requesterId, String reason) {
        if (resourceType == null || resourceType.isBlank()) {
            throw new IllegalArgumentException("Resource type is required");
        }
        if (resourceId == null || resourceId.isBlank()) {
            throw new IllegalArgumentException("Resource ID is required");
        }
        if (requesterId == null || requesterId.isBlank()) {
            throw new IllegalArgumentException("Requester ID is required");
        }

        Approval approval = new Approval(resourceType, resourceId, requesterId, reason);
        return approvalRepository.save(approval);
    }

    @Transactional(readOnly = true)
    public Optional<Approval> getApproval(UUID id) {
        return approvalRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public List<Approval> listApprovals(String status, String requesterId) {
        if (status != null && !status.isBlank()) {
            try {
                ApprovalStatus approvalStatus = ApprovalStatus.valueOf(status.toUpperCase());
                return approvalRepository.findByStatus(approvalStatus);
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid status: " + status);
            }
        }
        if (requesterId != null && !requesterId.isBlank()) {
            return approvalRepository.findByRequesterId(requesterId);
        }
        return approvalRepository.findAll();
    }

    @Transactional
    public Approval approveWithIdempotency(UUID id, String approverId, String idempotencyKey) {
        if (approverId == null || approverId.isBlank()) {
            throw new IllegalArgumentException("Approver ID is required");
        }

        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<IdempotencyKey> existingKey = idempotencyKeyRepository.findByKey(idempotencyKey);
            if (existingKey.isPresent()) {
                // Return cached response - idempotent replay
                return approvalRepository.findById(id)
                    .orElseThrow(() -> new ApprovalNotFoundException("Approval not found: " + id));
            }
        }

        Approval approval = approvalRepository.findByIdForUpdate(id)
            .orElseThrow(() -> new ApprovalNotFoundException("Approval not found: " + id));

        try {
            approval.approve(approverId);
            Approval savedApproval = approvalRepository.save(approval);

            if (idempotencyKey != null && !idempotencyKey.isBlank()) {
                IdempotencyKey key = new IdempotencyKey(idempotencyKey, 200, "{}");
                idempotencyKeyRepository.save(key);
            }

            return savedApproval;
        } catch (IllegalStateException e) {
            throw new ApprovalStateException(e.getMessage());
        }
    }

    @Transactional
    public Approval rejectWithIdempotency(UUID id, String approverId, String reason, String idempotencyKey) {
        if (approverId == null || approverId.isBlank()) {
            throw new IllegalArgumentException("Approver ID is required");
        }

        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<IdempotencyKey> existingKey = idempotencyKeyRepository.findByKey(idempotencyKey);
            if (existingKey.isPresent()) {
                // Return cached response - idempotent replay
                return approvalRepository.findById(id)
                    .orElseThrow(() -> new ApprovalNotFoundException("Approval not found: " + id));
            }
        }

        Approval approval = approvalRepository.findByIdForUpdate(id)
            .orElseThrow(() -> new ApprovalNotFoundException("Approval not found: " + id));

        try {
            approval.reject(approverId, reason);
            Approval savedApproval = approvalRepository.save(approval);

            if (idempotencyKey != null && !idempotencyKey.isBlank()) {
                IdempotencyKey key = new IdempotencyKey(idempotencyKey, 200, "{}");
                idempotencyKeyRepository.save(key);
            }

            return savedApproval;
        } catch (IllegalStateException e) {
            throw new ApprovalStateException(e.getMessage());
        }
    }
}
