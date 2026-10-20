package com.phase0demo.approve.adapter.rest;

import com.phase0demo.approve.application.ApprovalNotFoundException;
import com.phase0demo.approve.application.ApprovalService;
import com.phase0demo.approve.application.ApprovalStateException;
import com.phase0demo.approve.domain.Approval;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/approvals")
public class ApprovalController {

    private final ApprovalService approvalService;

    public ApprovalController(ApprovalService approvalService) {
        this.approvalService = approvalService;
    }

    @PostMapping
    public ResponseEntity<ApprovalResponse> createApproval(@RequestBody CreateApprovalRequest request) {
        try {
            String requesterId = getCurrentUserId();
            Approval approval = approvalService.createApproval(
                request.resourceType(),
                request.resourceId(),
                requesterId,
                request.reason()
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(approval));
        } catch (IllegalArgumentException e) {
            throw new BadRequestException(e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApprovalResponse> getApproval(@PathVariable UUID id) {
        return approvalService.getApproval(id)
            .map(approval -> ResponseEntity.ok(toResponse(approval)))
            .orElseThrow(() -> new ApprovalNotFoundException("Approval not found: " + id));
    }

    @GetMapping
    public ResponseEntity<List<ApprovalResponse>> listApprovals(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String requesterId) {
        try {
            List<Approval> approvals = approvalService.listApprovals(status, requesterId);
            List<ApprovalResponse> responses = approvals.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
            return ResponseEntity.ok(responses);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException(e.getMessage());
        }
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<ApprovalResponse> approveApproval(
            @PathVariable UUID id,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        try {
            String approverId = getCurrentUserId();
            if (!hasApproverRole()) {
                throw new UnauthorizedException("User does not have permission to approve");
            }
            Approval approval = approvalService.approveWithIdempotency(id, approverId, idempotencyKey);
            return ResponseEntity.ok(toResponse(approval));
        } catch (IllegalArgumentException e) {
            throw new BadRequestException(e.getMessage());
        } catch (ApprovalStateException e) {
            throw new ConflictException(e.getMessage());
        }
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<ApprovalResponse> rejectApproval(
            @PathVariable UUID id,
            @RequestBody(required = false) RejectApprovalRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        try {
            String approverId = getCurrentUserId();
            if (!hasApproverRole()) {
                throw new UnauthorizedException("User does not have permission to reject");
            }
            String reason = request != null ? request.reason() : null;
            Approval approval = approvalService.rejectWithIdempotency(id, approverId, reason, idempotencyKey);
            return ResponseEntity.ok(toResponse(approval));
        } catch (IllegalArgumentException e) {
            throw new BadRequestException(e.getMessage());
        } catch (ApprovalStateException e) {
            throw new ConflictException(e.getMessage());
        }
    }

    private ApprovalResponse toResponse(Approval approval) {
        return new ApprovalResponse(
            approval.getId(),
            approval.getResourceType(),
            approval.getResourceId(),
            approval.getStatus().name(),
            approval.getRequesterId(),
            approval.getApproverId(),
            approval.getReason(),
            approval.getRequestedAt(),
            approval.getApprovedAt(),
            approval.getRejectedAt()
        );
    }

    private String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new UnauthorizedException("User is not authenticated");
        }
        return auth.getName();
    }

    private boolean hasApproverRole() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            return false;
        }
        return auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_APPROVER") || a.getAuthority().equals("ROLE_ADMIN"));
    }
}
