package com.phase0demo.approve.adapter.rest;

public record CreateApprovalRequest(
    String resourceType,
    String resourceId,
    String reason
) {}
