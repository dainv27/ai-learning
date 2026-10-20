package com.phase0demo.reject.integration;

import com.phase0demo.reject.adapter.persistence.ApprovalEntity;
import com.phase0demo.reject.adapter.persistence.JpaApprovalRepository;
import com.phase0demo.reject.adapter.web.RejectRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RejectApprovalIT {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JpaApprovalRepository approvalRepository;

    private UUID pendingApprovalId;
    private UUID approvedApprovalId;
    private UUID rejectedApprovalId;

    @BeforeEach
    void setUp() {
        approvalRepository.deleteAll();

        ApprovalEntity pending = new ApprovalEntity();
        pending.setId(UUID.randomUUID());
        pending.setRequesterId("requester1");
        pending.setDescription("Pending approval");
        pending.setStatus("PENDING");
        pending.setCreatedAt(Instant.now());
        pending.setUpdatedAt(Instant.now());
        pendingApprovalId = approvalRepository.save(pending).getId();

        ApprovalEntity approved = new ApprovalEntity();
        approved.setId(UUID.randomUUID());
        approved.setRequesterId("requester2");
        approved.setDescription("Already approved");
        approved.setStatus("APPROVED");
        approved.setApproverId("approver1");
        approved.setComment("Looks good");
        approved.setCreatedAt(Instant.now());
        approved.setUpdatedAt(Instant.now());
        approvedApprovalId = approvalRepository.save(approved).getId();

        ApprovalEntity rejected = new ApprovalEntity();
        rejected.setId(UUID.randomUUID());
        rejected.setRequesterId("requester3");
        rejected.setDescription("Already rejected");
        rejected.setStatus("REJECTED");
        rejected.setApproverId("rejector1");
        rejected.setComment("Not acceptable");
        rejected.setCreatedAt(Instant.now());
        rejected.setUpdatedAt(Instant.now());
        rejectedApprovalId = approvalRepository.save(rejected).getId();
    }

    @Test
    @WithMockUser(username = "testuser")
    void shouldRejectPendingApproval() throws Exception {
        String requestBody = "{\"comment\":\"This does not meet requirements\"}";

        mockMvc.perform(post("/api/approvals/{id}/reject", pendingApprovalId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody)
                .header("Idempotency-Key", "reject-key-1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(pendingApprovalId.toString()))
            .andExpect(jsonPath("$.status").value("REJECTED"))
            .andExpect(jsonPath("$.approverId").value("testuser"))
            .andExpect(jsonPath("$.comment").value("This does not meet requirements"));
    }

    @Test
    @WithMockUser(username = "testuser")
    void shouldReturn409WhenRejectingApprovedApproval() throws Exception {
        String requestBody = "{\"comment\":\"Cannot reject\"}";

        mockMvc.perform(post("/api/approvals/{id}/reject", approvedApprovalId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody)
                .header("Idempotency-Key", "reject-key-2"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.error.code").value("INVALID_STATE_TRANSITION"))
            .andExpect(jsonPath("$.error.message").value("Cannot reject approval in status APPROVED. Only PENDING approvals can be rejected."));
    }

    @Test
    @WithMockUser(username = "testuser")
    void shouldReturn409WhenRejectingAlreadyRejectedApproval() throws Exception {
        String requestBody = "{\"comment\":\"Cannot reject again\"}";

        mockMvc.perform(post("/api/approvals/{id}/reject", rejectedApprovalId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody)
                .header("Idempotency-Key", "reject-key-3"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.error.code").value("INVALID_STATE_TRANSITION"))
            .andExpect(jsonPath("$.error.message").value("Cannot reject approval in status REJECTED. Only PENDING approvals can be rejected."));
    }

    @Test
    @WithMockUser(username = "testuser")
    void shouldReturn404WhenApprovalNotFound() throws Exception {
        UUID nonExistentId = UUID.randomUUID();
        String requestBody = "{\"comment\":\"Test\"}";

        mockMvc.perform(post("/api/approvals/{id}/reject", nonExistentId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody)
                .header("Idempotency-Key", "reject-key-4"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error.code").value("APPROVAL_NOT_FOUND"));
    }

    @Test
    @WithMockUser(username = "testuser")
    void shouldReturn400WhenIdempotencyKeyMissing() throws Exception {
        String requestBody = "{\"comment\":\"Test\"}";

        mockMvc.perform(post("/api/approvals/{id}/reject", pendingApprovalId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("MISSING_IDEMPOTENCY_KEY"));
    }

    @Test
    @WithMockUser(username = "testuser")
    void shouldReturnCachedResultForDuplicateIdempotencyKey() throws Exception {
        String requestBody = "{\"comment\":\"First rejection\"}";
        String idempotencyKey = "reject-key-duplicate";

        // First request
        mockMvc.perform(post("/api/approvals/{id}/reject", pendingApprovalId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody)
                .header("Idempotency-Key", idempotencyKey))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("REJECTED"))
            .andExpect(jsonPath("$.comment").value("First rejection"));

        // Second request with same idempotency key but different comment
        String secondRequestBody = "{\"comment\":\"Different comment\"}";
        mockMvc.perform(post("/api/approvals/{id}/reject", pendingApprovalId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(secondRequestBody)
                .header("Idempotency-Key", idempotencyKey))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("REJECTED"))
            .andExpect(jsonPath("$.comment").value("First rejection")); // Should return cached result
    }
}
