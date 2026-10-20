package com.phase0demo.approve.application.service;

public class ApprovalNotFoundException extends RuntimeException {
    public ApprovalNotFoundException(String message) {
        super(message);
    }
}
