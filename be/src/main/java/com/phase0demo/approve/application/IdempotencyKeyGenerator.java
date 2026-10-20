package com.phase0demo.approve.application;

import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class IdempotencyKeyGenerator {
    
    public String generateIdempotencyKey() {
        long timestamp = System.currentTimeMillis();
        String uuid = UUID.randomUUID().toString();
        return "idem-" + timestamp + "-" + uuid;
    }
}
