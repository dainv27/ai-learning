package com.example.approve;

import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.concurrent.TimeUnit;
import static java.time.temporal.ChronoUnit.SECONDS;

@RestController
@RequestMapping("/api/approvals")
public class ApprovalController {
    private final ApprovalService approvalService;

    public ApprovalController(ApprovalService approvalService) {
        this.approvalService = approvalService;
    }

    @PostMapping
    public ResponseEntity<String> approve(@RequestHeader("Idempotency-Key") String idempotencyKey, @RequestBody Map<String, Object> request) {
        try {
            return approvalService.processApproval(idempotencyKey, request);
        } catch (Exception e) {
            return ResponseEntity.status(400).body("Invalid request: " + e.getMessage());
        }
    }

    @GetMapping("/status/{id}")
    public ResponseEntity<String> getApprovalStatus(@PathVariable String id) {
        return ResponseEntity.ok("Status for approval " + id + " is pending");
    }
}