package com.phase0demo.reject.adapter.persistence;

import com.phase0demo.reject.domain.model.Approval;
import com.phase0demo.reject.domain.model.ApprovalStatus;
import com.phase0demo.reject.domain.port.ApprovalRepository;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

@Component
public class JpaApprovalAdapter implements ApprovalRepository {
    private final JpaApprovalRepository jpaRepository;
    private final JpaIdempotencyRepository idempotencyRepository;

    public JpaApprovalAdapter(JpaApprovalRepository jpaRepository, JpaIdempotencyRepository idempotencyRepository) {
        this.jpaRepository = jpaRepository;
        this.idempotencyRepository = idempotencyRepository;
    }

    @Override
    public Optional<Approval> findById(UUID id) {
        return jpaRepository.findById(id).map(this::toDomain);
    }

    @Override
    public Approval save(Approval approval) {
        ApprovalEntity entity = toEntity(approval);
        ApprovalEntity saved = jpaRepository.save(entity);
        return toDomain(saved);
    }

    @Override
    public Optional<Approval> findByIdempotencyKey(String idempotencyKey) {
        return idempotencyRepository.findByIdempotencyKey(idempotencyKey)
            .flatMap(entity -> jpaRepository.findById(entity.getApprovalId()))
            .map(this::toDomain);
    }

    private Approval toDomain(ApprovalEntity entity) {
        return new Approval(
            entity.getId(),
            entity.getRequesterId(),
            entity.getDescription(),
            ApprovalStatus.valueOf(entity.getStatus()),
            entity.getApproverId(),
            entity.getComment(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }

    private ApprovalEntity toEntity(Approval approval) {
        ApprovalEntity entity = new ApprovalEntity();
        entity.setId(approval.getId());
        entity.setRequesterId(approval.getRequesterId());
        entity.setDescription(approval.getDescription());
        entity.setStatus(approval.getStatus().name());
        entity.setApproverId(approval.getApproverId());
        entity.setComment(approval.getComment());
        entity.setCreatedAt(approval.getCreatedAt());
        entity.setUpdatedAt(approval.getUpdatedAt());
        return entity;
    }
}
