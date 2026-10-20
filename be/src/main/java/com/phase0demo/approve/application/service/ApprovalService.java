package com.phase0demo.approve.application.service;

import com.phase0demo.approve.application.port.in.ApprovalUseCase;
import com.phase0demo.approve.application.port.in.ApproveCommand;
import com.phase0demo.approve.application.port.in.RejectCommand;
import com.phase0demo.approve.application.port.out.AuthorizationPort;
import com.phase0demo.approve.domain.Approval;
import com.phase0demo.approve.domain.ApprovalRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.UUID;

@Service
public class ApprovalService implements ApprovalUseCase {
    private final ApprovalRepository repository;
    private final AuthorizationPort authorizationPort;
    private final Clock clock;

    public ApprovalService(ApprovalRepository repository,
                          AuthorizationPort authorizationPort,
                          Clock clock) {
        this.repository = repository;
        this.authorizationPort = authorizationPort;
        this.clock = clock;
    }

    @Override
    @Transactional
    public Approval approve(ApproveCommand command) {
        // Check idempotency first
        if (repository.existsByIdempotencyKey(command.idempotencyKey())) {
            return repository.findByIdempotencyKey(command.idempotencyKey())
                .orElseThrow(() -> new IllegalStateException("Idempotency key exists but approval not found"));
        }

        // Load approval with pessimistic lock to prevent concurrent modifications
        Approval approval = repository.findByIdWithLock(command.approvalId())
            .orElseThrow(() -> new ApprovalNotFoundException(command.approvalId()));

        // Verify authorization
        if (!authorizationPort.canApprove(command.approverId(),
                                         approval.getResourceId(),
                                         approval.getResourceType())) {
            throw new UnauthorizedException(
                "User " + command.approverId() + " cannot approve resource " + approval.getResourceId());
        }

        // Execute state transition
        approval.approve(command.approverId(), command.comment(), clock.instant());

        // Save and record idempotency
        Approval saved = repository.save(approval);
        repository.saveIdempotencyKey(command.idempotencyKey(), saved.getId());

        return saved;
    }

    @Override
    @Transactional
    public Approval reject(RejectCommand command) {
        // Check idempotency first
        if (repository.existsByIdempotencyKey(command.idempotencyKey())) {
            return repository.findByIdempotencyKey(command.idempotencyKey())
                .orElseThrow(() -> new IllegalStateException("Idempotency key exists but approval not found"));
        }

        // Load approval with pessimistic lock
        Approval approval = repository.findByIdWithLock(command.approvalId())
            .orElseThrow(() -> new ApprovalNotFoundException(command.approvalId()));

        // Verify authorization
        if (!authorizationPort.canApprove(command.approverId(),
                                         approval.getResourceId(),
                                         approval.getResourceType())) {
            throw new UnauthorizedException(
                "User " + command.approverId() + " cannot reject resource " + approval.getResourceId());
        }

        // Execute state transition
        approval.reject(command.approverId(), command.comment(), clock.instant());

        // Save and record idempotency
        Approval saved = repository.save(approval);
        repository.saveIdempotencyKey(command.idempotencyKey(), saved.getId());

        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public Approval getApproval(UUID id) {
        return repository.findById(id)
            .orElseThrow(() -> new ApprovalNotFoundException(id));
    }

    public static class ApprovalNotFoundException extends RuntimeException {
        public ApprovalNotFoundException(UUID id) {
            super("Approval not found: " + id);
        }
    }

    public static class UnauthorizedException extends RuntimeException {
        public UnauthorizedException(String message) {
            super(message);
        }
    }
}