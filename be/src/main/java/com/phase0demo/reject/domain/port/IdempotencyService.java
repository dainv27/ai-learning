package com.phase0demo.reject.domain.port;

import java.util.UUID;

public interface IdempotencyService {
    void recordKey(String idempotencyKey, UUID approvalId);
    boolean isKeyUsed(String idempotencyKey);
}
