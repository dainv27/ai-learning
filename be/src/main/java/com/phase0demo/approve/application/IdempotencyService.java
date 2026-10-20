package com.phase0demo.approve.application;

import com.phase0demo.approve.domain.Approval;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
public class IdempotencyService {
    private final ConcurrentMap<String, Approval> idempotencyCache = new ConcurrentHashMap<>();

    public Approval checkIdempotency(String idempotencyKey) {
        return idempotencyCache.get(idempotencyKey);
    }

    public void storeIdempotency(String idempotencyKey, Approval approval) {
        idempotencyCache.put(idempotencyKey, approval);
    }
}
