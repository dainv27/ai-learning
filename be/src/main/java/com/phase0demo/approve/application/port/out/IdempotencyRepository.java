package com.phase0demo.approve.application.port.out;

import java.util.Optional;

public interface IdempotencyRepository {
    boolean recordOperation(String idempotencyKey, String operationResult);
    Optional<String> findResult(String idempotencyKey);
}
