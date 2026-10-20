package com.phase0demo.approve.application;

public class ApprovalNotFoundException extends RuntimeException {
    public ApprovalNotFoundException(String message) {
        super(message);
    }
}
