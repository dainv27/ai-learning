package com.phase0demo.approve.api;

import com.phase0demo.approve.application.ApprovalService;
import com.phase0demo.approve.domain.ApprovalRequest;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/approvals")
@Validated
public class ApprovalController {

    private final ApprovalService approvalService;

    public ApprovalController(ApprovalService approvalService) {
        this.approvalService = approvalService;
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<ApprovalRequest> approve(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body,
            @RequestHeader("Idempotency-Key") @NotNull String idempotencyKey,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String approverId = userDetails.getUsername();
        String comment = body != null ? body.get("comment") : null;
        
        ApprovalRequest result = approvalService.approve(id, approverId, comment, idempotencyKey);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<ApprovalRequest> reject(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body,
            @RequestHeader("Idempotency-Key") @NotNull String idempotencyKey,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String approverId = userDetails.getUsername();
        String comment = body != null ? body.get("comment") : null;
        
        ApprovalRequest result = approvalService.reject(id, approverId, comment, idempotencyKey);
        return ResponseEntity.ok(result);
    }
}
