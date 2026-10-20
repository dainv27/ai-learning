package com.phase0demo.approve.application.service;

import com.phase0demo.approve.application.port.in.ApproveUseCase;
import com.phase0demo.approve.application.port.in.RejectUseCase;
import com.phase0demo.approve.application.port.out.ApprovalRepository;
import com.phase0demo.approve.application.port.out.IdempotencyRepository;
import com.phase0demo.approve.domain.ApprovalRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ApprovalService implements ApproveUseCase, RejectUseCase {
    private final ApprovalRepository approvalRepository;
    private final IdempotencyRepository idempotencyRepository;

    public ApprovalService(ApprovalRepository approvalRepository, IdempotencyRepository idempotencyRepository) {
        this.approvalRepository = approvalRepository;
        this.idempotencyRepository = idempotencyRepository;
    }

    @Override
    @Transactional
    public ApprovalResult approve(ApprovalCommand command) {
        var existingResult = idempotencyRepository.findResult(command.idempotencyKey());
        if (existingResult.isPresent()) {
            return new ApprovalResult(
                command.approvalRequestId(),
                existingResult.get(),
                true
            );
        }

        ApprovalRequest approvalRequest = approvalRepository.findById(command.approvalRequestId())
            .orElseThrow(() -> new ApprovalNotFoundException(
                "Approval request not found: " + command.approvalRequestId()
            ));

        approvalRequest.approve(command.reviewerId(), command.comment());
        approvalRepository.save(approvalRequest);

        String status = approvalRequest.getStatus().name();
        idempotencyRepository.recordOperation(command.idempotencyKey(), status);

        return new ApprovalResult(command.approvalRequestId(), status, false);
    }

    @Override
    @Transactional
    public RejectionResult reject(RejectionCommand command) {
        var existingResult = idempotencyRepository.findResult(command.idempotencyKey());
        if (existingResult.isPresent()) {
            return new RejectionResult(
                command.approvalRequestId(),
                existingResult.get(),
                true
            );
        }

        ApprovalRequest approvalRequest = approvalRepository.findById(command.approvalRequestId())
            .orElseThrow(() -> new ApprovalNotFoundException(
                "Approval request not found: " + command.approvalRequestId()
            ));

        approvalRequest.reject(command.reviewerId(), command.comment());
        approvalRepository.save(approvalRequest);

        String status = approvalRequest.getStatus().name();
        idempotencyRepository.recordOperation(command.idempotencyKey(), status);

        return new RejectionResult(command.approvalRequestId(), status, false);
    }
}
