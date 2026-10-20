package com.phase0demo.approve.adapter.in.web;

import com.phase0demo.approve.application.port.in.ApproveUseCase;
import com.phase0demo.approve.application.port.in.RejectUseCase;
import com.phase0demo.approve.application.service.ApprovalNotFoundException;
import com.phase0demo.approve.domain.InvalidStateTransitionException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/approvals")
public class ApprovalController {
    private final ApproveUseCase approveUseCase;
    private final RejectUseCase rejectUseCase;

    public ApprovalController(ApproveUseCase approveUseCase, RejectUseCase rejectUseCase) {
        this.approveUseCase = approveUseCase;
        this.rejectUseCase = rejectUseCase;
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<ApprovalResponse> approve(
        @PathVariable UUID id,
        @RequestBody ApprovalRequest request,
        @RequestHeader("Idempotency-Key") String idempotencyKey
    ) {
        var command = new ApproveUseCase.ApprovalCommand(
            id,
            request.reviewerId(),
            request.comment(),
            idempotencyKey
        );

        var result = approveUseCase.approve(command);

        return ResponseEntity.ok(new ApprovalResponse(
            result.approvalRequestId().toString(),
            result.status(),
            result.wasIdempotent()
        ));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<RejectionResponse> reject(
        @PathVariable UUID id,
        @RequestBody RejectionRequest request,
        @RequestHeader("Idempotency-Key") String idempotencyKey
    ) {
        var command = new RejectUseCase.RejectionCommand(
            id,
            request.reviewerId(),
            request.comment(),
            idempotencyKey
        );

        var result = rejectUseCase.reject(command);

        return ResponseEntity.ok(new RejectionResponse(
            result.approvalRequestId().toString(),
            result.status(),
            result.wasIdempotent()
        ));
    }

    @ExceptionHandler(ApprovalNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ApprovalNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(new ErrorResponse(new ErrorDetail("APPROVAL_NOT_FOUND", ex.getMessage())));
    }

    @ExceptionHandler(InvalidStateTransitionException.class)
    public ResponseEntity<ErrorResponse> handleInvalidStateTransition(InvalidStateTransitionException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(new ErrorResponse(new ErrorDetail("INVALID_STATE_TRANSITION", ex.getMessage())));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(new ErrorResponse(new ErrorDetail("INVALID_INPUT", ex.getMessage())));
    }

    record ApprovalRequest(String reviewerId, String comment) {}
    record ApprovalResponse(String approvalRequestId, String status, boolean wasIdempotent) {}
    record RejectionRequest(String reviewerId, String comment) {}
    record RejectionResponse(String approvalRequestId, String status, boolean wasIdempotent) {}
    record ErrorResponse(ErrorDetail error) {}
    record ErrorDetail(String code, String message) {}
}
