package com.example.approve;

import org.springframework.stereotype.Component;
import java.util.Map;

@Component
public class ApprovalValidator {
    public boolean validateRequest(Map<String, Object> request) {
        return request.containsKey("requestId") && 
               request.containsKey("userId") && 
               request.containsKey("action");
    }
}