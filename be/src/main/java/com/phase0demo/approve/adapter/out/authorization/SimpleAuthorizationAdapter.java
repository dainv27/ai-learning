package com.phase0demo.approve.adapter.out.authorization;

import com.phase0demo.approve.application.port.out.AuthorizationPort;
import com.phase0demo.approve.domain.ApprovalRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class SimpleAuthorizationAdapter implements AuthorizationPort {
    private static final Logger log = LoggerFactory.getLogger(SimpleAuthorizationAdapter.class);
    private final ApprovalRepository approvalRepository;

    public SimpleAuthorizationAdapter(ApprovalRepository approvalRepository) {
        this.approvalRepository = approvalRepository;
    }

    @Override
    public boolean canApprove(String userId, String resourceId, String resourceType) {
        // Basic authorization logic:
        // 1. User must have APPROVER role
        // 2. User cannot approve their own request
        // TODO: Production enhancements:
        //   - Integrate with external authorization service (e.g., OPA, AWS Verified Permissions)
        //   - Add resource-type-specific rules (e.g., budget thresholds, department boundaries)
        //   - Support approval delegation and escalation workflows
        //   - Audit all authorization decisions to a separate audit log

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            log.warn("Authorization check failed: no authenticated user");
            return false;
        }

        // Check for APPROVER role
        boolean hasApproverRole = auth.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .anyMatch(role -> role.equals("ROLE_APPROVER") || role.equals("ROLE_ADMIN"));

        if (!hasApproverRole) {
            log.warn("Authorization check failed: user {} lacks APPROVER role", userId);
            return false;
        }

        // Check that user is not approving their own request
        // Load the approval to get requesterId
        try {
            UUID approvalId = UUID.fromString(resourceId);
            return approvalRepository.findById(approvalId)
                .map(approval -> {
                    if (approval.getRequesterId().equals(userId)) {
                        log.warn("Authorization check failed: user {} cannot approve their own request {}",
                            userId, resourceId);
                        return false;
                    }
                    log.info("Authorization check passed: user {} can approve resource {} (type: {})",
                        userId, resourceId, resourceType);
                    return true;
                })
                .orElse(false);
        } catch (IllegalArgumentException e) {
            log.error("Authorization check failed: invalid resource ID format: {}", resourceId);
            return false;
        }
    }
}