package com.phase0demo.approve.adapter.out.persistence;

import com.phase0demo.approve.application.port.out.IdempotencyRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class InMemoryIdempotencyRepository implements IdempotencyRepository {
    private final ConcurrentHashMap<String, String> operations = new ConcurrentHashMap<>();

    @Override
    public boolean recordOperation(String idempotencyKey, String operationResult) {
        return operations.putIfAbsent(idempotencyKey, operationResult) == null;
    }

    @Override
    public Optional<String> findResult(String idempotencyKey) {
        return Optional.ofNullable(operations.get(idempotencyKey));
    }
}
