package com.phase0demo.approve.adapter.out.authorization;

import com.phase0demo.approve.application.port.out.AuthorizationPort;
import org.springframework.stereotype.Component;

@Component
public class SimpleAuthorizationAdapter implements AuthorizationPort {
    @Override
    public boolean canApprove(String userId, String resourceId, String resourceType) {
        // Simple implementation: all authenticated users can approve
        // In production, this would check roles, permissions, resource ownership, etc.
        return userId != null && !userId.isBlank();
    }
}