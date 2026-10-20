package com.example.approve;

import java.util.*;

public class ApprovalStateTransitionHandler {
    private static final Map<String, Set<String>> stateTransitions = new HashMap<>();

    static {
        stateTransitions.put("PENDING", new HashSet<>(Arrays.asList("APPROVED", "REJECTED")));
        stateTransitions.put("APPROVED", new HashSet<>(Arrays.asList("CLOSED")));
        stateTransitions.put("REJECTED", new HashSet<>(Arrays.asList("CLOSED")));
        stateTransitions.put("CLOSED", new HashSet<>(Arrays.asList()));
    }

    public String handleTransition(Map<String, Object> approval) {
        String currentState = (String) approval.get("status");
        String requestedState = (String) approval.get("action");
        
        if (!stateTransitions.getOrDefault(currentState, Collections.emptySet()).contains(requestedState)) {
            return "PENDING";
        }
        return requestedState;
    }
}