package com.phase0demo.approve.api;

import com.phase0demo.approve.domain.ApprovalRequestNotFoundException;
import com.phase0demo.approve.domain.InvalidStateTransitionException;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.net.URI;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApprovalRequestNotFoundException.class)
    public ProblemDetail handleNotFound(ApprovalRequestNotFoundException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
            HttpStatus.NOT_FOUND,
            ex.getMessage()
        );
        problemDetail.setType(URI.create("https://phase0-demo.example.com/problems/not-found"));
        problemDetail.setTitle("Approval Request Not Found");
        return problemDetail;
    }

    @ExceptionHandler(InvalidStateTransitionException.class)
    public ProblemDetail handleInvalidStateTransition(InvalidStateTransitionException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
            HttpStatus.CONFLICT,
            ex.getMessage()
        );
        problemDetail.setType(URI.create("https://phase0-demo.example.com/problems/invalid-state-transition"));
        problemDetail.setTitle("Invalid State Transition");
        return problemDetail;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail handleIllegalArgument(IllegalArgumentException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
            HttpStatus.BAD_REQUEST,
            ex.getMessage()
        );
        problemDetail.setType(URI.create("https://phase0-demo.example.com/problems/invalid-input"));
        problemDetail.setTitle("Invalid Input");
        return problemDetail;
    }

    @ExceptionHandler(MissingRequestHeaderException.class)
    public ProblemDetail handleMissingHeader(MissingRequestHeaderException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
            HttpStatus.BAD_REQUEST,
            "Required header '" + ex.getHeaderName() + "' is missing"
        );
        problemDetail.setType(URI.create("https://phase0-demo.example.com/problems/missing-header"));
        problemDetail.setTitle("Missing Required Header");
        return problemDetail;
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ProblemDetail handleConstraintViolation(ConstraintViolationException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
            HttpStatus.BAD_REQUEST,
            ex.getMessage()
        );
        problemDetail.setType(URI.create("https://phase0-demo.example.com/problems/validation-error"));
        problemDetail.setTitle("Validation Error");
        return problemDetail;
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ProblemDetail handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
            HttpStatus.BAD_REQUEST,
            "Invalid format for parameter '" + ex.getName() + "'"
        );
        problemDetail.setType(URI.create("https://phase0-demo.example.com/problems/invalid-format"));
        problemDetail.setTitle("Invalid Parameter Format");
        return problemDetail;
    }
}
