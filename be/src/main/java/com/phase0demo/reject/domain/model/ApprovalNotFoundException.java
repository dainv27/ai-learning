package com.phase0demo.reject.domain.model;

import java.util.UUID;

public class ApprovalNotFoundException extends RuntimeException {
    public ApprovalNotFoundException(UUID id) {
        super("Approval not found: " + id);
    }
}
