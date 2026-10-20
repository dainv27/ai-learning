package com.phase0demo.reject.adapter.web;

import com.phase0demo.reject.application.RejectApprovalUseCase;
import com.phase0demo.reject.domain.model.Approval;
import com.phase0demo.reject.domain.model.ApprovalNotFoundException;
import com.phase0demo.reject.domain.model.InvalidStateTransitionException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/approvals")
public class RejectController {
    private final RejectApprovalUseCase rejectApprovalUseCase;

    public RejectController(RejectApprovalUseCase rejectApprovalUseCase) {
        this.rejectApprovalUseCase = rejectApprovalUseCase;
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<?> rejectApproval(
            @PathVariable UUID id,
            @RequestBody RejectRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal UserDetails user) {

        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", Map.of(
                    "code", "MISSING_IDEMPOTENCY_KEY",
                    "message", "Idempotency-Key header is required"
                )
            ));
        }

        try {
            Approval approval = rejectApprovalUseCase.execute(
                id,
                user.getUsername(),
                request.comment(),
                idempotencyKey
            );

            return ResponseEntity.ok(new ApprovalResponse(
                approval.getId(),
                approval.getRequesterId(),
                approval.getDescription(),
                approval.getStatus().name(),
                approval.getApproverId(),
                approval.getComment(),
                approval.getCreatedAt(),
                approval.getUpdatedAt()
            ));
        } catch (ApprovalNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "error", Map.of(
                    "code", "APPROVAL_NOT_FOUND",
                    "message", e.getMessage()
                )
            ));
        } catch (InvalidStateTransitionException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "error", Map.of(
                    "code", "INVALID_STATE_TRANSITION",
                    "message", e.getMessage()
                )
            ));
        }
    }
}
