package com.phase0demo.approve.application.port.in;

import com.phase0demo.approve.domain.Approval;

import java.util.UUID;

public interface ApprovalUseCase {
    Approval approve(ApproveCommand command);
    Approval reject(RejectCommand command);
    Approval getApproval(UUID id);
}