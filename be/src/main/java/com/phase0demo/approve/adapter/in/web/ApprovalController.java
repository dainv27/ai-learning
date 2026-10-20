package com.phase0demo.approve.adapter.in.web;

import com.phase0demo.approve.application.port.in.ApprovalUseCase;
import com.phase0demo.approve.application.port.in.ApproveCommand;
import com.phase0demo.approve.application.port.in.RejectCommand;
import com.phase0demo.approve.application.service.ApprovalService;
import com.phase0demo.approve.domain.Approval;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/approvals")
public class ApprovalController {
    private final ApprovalUseCase approvalUseCase;

    public ApprovalController(ApprovalUseCase approvalUseCase) {
        this.approvalUseCase = approvalUseCase;
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<ApprovalResponse> approve(
            @PathVariable UUID id,
            @RequestBody ApproveRequest request,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @AuthenticationPrincipal UserDetails user) {

        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new MissingIdempotencyKeyException();
        }

        ApproveCommand command = new ApproveCommand(
            id,
            user.getUsername(),
            request.comment(),
            idempotencyKey
        );

        Approval approval = approvalUseCase.approve(command);
        return ResponseEntity.ok(ApprovalResponse.fromDomain(approval));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<ApprovalResponse> reject(
            @PathVariable UUID id,
            @RequestBody RejectRequest request,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @AuthenticationPrincipal UserDetails user) {

        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new MissingIdempotencyKeyException();
        }

        RejectCommand command = new RejectCommand(
            id,
            user.getUsername(),
            request.comment(),
            idempotencyKey
        );

        Approval approval = approvalUseCase.reject(command);
        return ResponseEntity.ok(ApprovalResponse.fromDomain(approval));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApprovalResponse> getApproval(
            @PathVariable UUID id) {
        Approval approval = approvalUseCase.getApproval(id);
        return ResponseEntity.ok(ApprovalResponse.fromDomain(approval));
    }

    @ExceptionHandler(ApprovalService.ApprovalNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ApprovalService.ApprovalNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(new ErrorResponse("APPROVAL_NOT_FOUND", ex.getMessage()));
    }

    @ExceptionHandler(ApprovalService.UnauthorizedException.class)
    public ResponseEntity<ErrorResponse> handleUnauthorized(ApprovalService.UnauthorizedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(new ErrorResponse("FORBIDDEN", ex.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleIllegalState(IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(new ErrorResponse("INVALID_STATE_TRANSITION", ex.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(new ErrorResponse("INVALID_REQUEST", ex.getMessage()));
    }

    @ExceptionHandler(MissingIdempotencyKeyException.class)
    public ResponseEntity<ErrorResponse> handleMissingIdempotencyKey(MissingIdempotencyKeyException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(new ErrorResponse("MISSING_IDEMPOTENCY_KEY", "Idempotency-Key header is required"));
    }

    public static class MissingIdempotencyKeyException extends RuntimeException {}

    public record ErrorResponse(String code, String message) {}
}