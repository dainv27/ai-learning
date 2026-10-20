package com.example.approve;

import org.springframework.stereotype.Service;
import java.util.*;
import java.util.concurrent.TimeUnit;
import static java.time.temporal.ChronoUnit.SECONDS;

@Service
public class ApprovalService {
    private final ApprovalValidator validator;
    private final IdempotencyService idempotencyService;
    private final ApprovalStateTransitionHandler stateHandler;

    public ApprovalService(ApprovalValidator validator, IdempotencyService idempotencyService, ApprovalStateTransitionHandler stateHandler) {
        this.validator = validator;
        this.idempotencyService = idempotencyService;
        this.stateHandler = stateHandler;
    }

    public ResponseEntity<String> processApproval(String idempotencyKey, Map<String, Object> request) {
        if (!idempotencyService.validateIdempotency(idempotencyKey)) {
            return ResponseEntity.status(400).body("Invalid idempotency key");
        }

        if (!validator.validateRequest(request)) {
            return ResponseEntity.status(400).body("Missing required fields: requestId, userId, action");
        }

        // Simulate RBAC check
        if (!request.containsKey("userRole") || !Arrays.asList("ADMIN", "MANAGER").contains(request.get("userRole"))) {
            return ResponseEntity.status(403).body("Access denied");
        }

        String approvalId = UUID.randomUUID().toString();
        Map<String, Object> approval = new HashMap<>();
        approval.put("id", approvalId);
        approval.put("requestId", request.get("requestId"));
        approval.put("userId", request.get("userId"));
        approval.put("status", "PENDING");
        approval.put("timestamp", System.currentTimeMillis());

        // Simulate state transition
        String newState = stateHandler.handleTransition(approval);
        approval.put("status", newState);

        // Store in database (mocked)
        System.out.println("Storing approval: " + approval);
        return ResponseEntity.ok("Approval processed with ID: " + approvalId);
    }
}