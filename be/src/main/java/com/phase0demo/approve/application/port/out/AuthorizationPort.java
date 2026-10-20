package com.phase0demo.approve.application.port.out;

public interface AuthorizationPort {
    boolean canApprove(String userId, String resourceId, String resourceType);
}