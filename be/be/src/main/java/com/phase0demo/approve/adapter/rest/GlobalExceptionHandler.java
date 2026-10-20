package com.phase0demo.approve.adapter.rest;

import com.phase0demo.approve.application.ApprovalNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApprovalNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleApprovalNotFound(ApprovalNotFoundException e) {
        ErrorResponse error = new ErrorResponse(
            new ErrorResponse.ErrorDetail("APPROVAL_NOT_FOUND", e.getMessage())
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ErrorResponse> handleBadRequest(BadRequestException e) {
        ErrorResponse error = new ErrorResponse(
            new ErrorResponse.ErrorDetail("BAD_REQUEST", e.getMessage())
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ErrorResponse> handleUnauthorized(UnauthorizedException e) {
        ErrorResponse error = new ErrorResponse(
            new ErrorResponse.ErrorDetail("UNAUTHORIZED", e.getMessage())
        );
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ErrorResponse> handleConflict(ConflictException e) {
        ErrorResponse error = new ErrorResponse(
            new ErrorResponse.ErrorDetail("CONFLICT", e.getMessage())
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException e) {
        ErrorResponse error = new ErrorResponse(
            new ErrorResponse.ErrorDetail("BAD_REQUEST", e.getMessage())
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception e) {
        ErrorResponse error = new ErrorResponse(
            new ErrorResponse.ErrorDetail("INTERNAL_ERROR", "An internal error occurred")
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}
