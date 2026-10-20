package com.phase0demo.approve.adapter.web;

import com.phase0demo.approve.application.ApprovalService;
import com.phase0demo.approve.domain.Approval;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/approvals")
public class ApprovalController {
    private final ApprovalService approvalService;

    public ApprovalController(ApprovalService approvalService) {
        this.approvalService = approvalService;
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<?> approve(
            @PathVariable("id") UUID approvalId,
            @RequestBody ApprovalRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("error", Map.of("code", "UNAUTHORIZED", "message", "Authentication required")));
        }

        try {
            String approverId = userDetails.getUsername();
            Approval approval = approvalService.approve(approvalId, approverId, request.comment(), idempotencyKey);
            return ResponseEntity.ok(toResponse(approval));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("error", Map.of("code", "INVALID_STATE_TRANSITION", "message", e.getMessage())));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", Map.of("code", "NOT_FOUND", "message", e.getMessage())));
        }
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<?> reject(
            @PathVariable("id") UUID approvalId,
            @RequestBody ApprovalRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("error", Map.of("code", "UNAUTHORIZED", "message", "Authentication required")));
        }

        try {
            String approverId = userDetails.getUsername();
            Approval approval = approvalService.reject(approvalId, approverId, request.comment(), idempotencyKey);
            return ResponseEntity.ok(toResponse(approval));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("error", Map.of("code", "INVALID_STATE_TRANSITION", "message", e.getMessage())));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", Map.of("code", "NOT_FOUND", "message", e.getMessage())));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(
            @PathVariable("id") UUID approvalId) {
        try {
            Approval approval = approvalService.getApproval(approvalId);
            return ResponseEntity.ok(toResponse(approval));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", Map.of("code", "NOT_FOUND", "message", e.getMessage())));
        }
    }

    private ApprovalResponse toResponse(Approval approval) {
        return new ApprovalResponse(
            approval.getId(),
            approval.getRequesterId(),
            approval.getStatus().name(),
            approval.getComment(),
            approval.getApproverId(),
            approval.getCreatedAt(),
            approval.getUpdatedAt()
        );
    }
}
