package com.example.approve;

import java.util.concurrent.TimeUnit;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;

public class IdempotencyService {
    private final ConcurrentHashMap<String, Long> idempotencyStore = new ConcurrentHashMap<>();
    private final AtomicLong sequenceGenerator = new AtomicLong();
    private final ReentrantLock lock = new ReentrantLock();

    public boolean validateIdempotency(String idempotencyKey) {
        lock.lock();
        try {
            Long timestamp = idempotencyStore.get(idempotencyKey);
            if (timestamp == null) {
                // Generate new idempotency key
                String newKey = "IDP_" + sequenceGenerator.incrementAndGet();
                idempotencyStore.put(newKey, System.currentTimeMillis());
                return false;
            }
            if (System.currentTimeMillis() - timestamp > TimeUnit.SECONDS.toMillis(30)) {
                idempotencyStore.remove(idempotencyKey);
                return false;
            }
            return true;
        } finally {
            lock.unlock();
        }
    }
}