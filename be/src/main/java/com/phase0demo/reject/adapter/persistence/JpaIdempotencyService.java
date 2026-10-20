package com.phase0demo.reject.adapter.persistence;

import com.phase0demo.reject.domain.port.IdempotencyService;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Service
public class JpaIdempotencyService implements IdempotencyService {
    private final JpaIdempotencyRepository repository;

    public JpaIdempotencyService(JpaIdempotencyRepository repository) {
        this.repository = repository;
    }

    @Override
    public void recordKey(String idempotencyKey, UUID approvalId) {
        IdempotencyEntity entity = new IdempotencyEntity();
        entity.setIdempotencyKey(idempotencyKey);
        entity.setApprovalId(approvalId);
        entity.setCreatedAt(Instant.now());
        repository.save(entity);
    }

    @Override
    public boolean isKeyUsed(String idempotencyKey) {
        return repository.findByIdempotencyKey(idempotencyKey).isPresent();
    }
}
