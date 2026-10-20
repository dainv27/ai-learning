package com.phase0demo.approve.adapter.out.persistence;

import com.phase0demo.approve.domain.Approval;
import com.phase0demo.approve.domain.ApprovalRepository;
import com.phase0demo.approve.domain.ApprovalStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class JpaApprovalRepository implements ApprovalRepository {
    private final SpringDataApprovalRepository springRepo;
    private final SpringDataIdempotencyRepository idempotencyRepo;

    public JpaApprovalRepository(SpringDataApprovalRepository springRepo,
                                SpringDataIdempotencyRepository idempotencyRepo) {
        this.springRepo = springRepo;
        this.idempotencyRepo = idempotencyRepo;
    }

    @Override
    public Optional<Approval> findById(UUID id) {
        return springRepo.findById(id).map(ApprovalEntity::toDomain);
    }

    @Override
    public Optional<Approval> findByIdWithLock(UUID id) {
        return springRepo.findByIdWithLock(id).map(ApprovalEntity::toDomain);
    }

    @Override
    public List<Approval> findByResourceId(String resourceId) {
        return springRepo.findByResourceId(resourceId).stream()
            .map(ApprovalEntity::toDomain)
            .toList();
    }

    @Override
    public List<Approval> findByStatus(ApprovalStatus status) {
        return springRepo.findByStatus(status).stream()
            .map(ApprovalEntity::toDomain)
            .toList();
    }

    @Override
    public Approval save(Approval approval) {
        ApprovalEntity entity = ApprovalEntity.fromDomain(approval);
        ApprovalEntity saved = springRepo.save(entity);
        return saved.toDomain();
    }

    @Override
    public boolean existsByIdempotencyKey(String idempotencyKey) {
        return idempotencyRepo.existsByIdempotencyKey(idempotencyKey);
    }

    @Override
    public Optional<Approval> findByIdempotencyKey(String idempotencyKey) {
        return idempotencyRepo.findByIdempotencyKey(idempotencyKey)
            .flatMap(ik -> springRepo.findById(ik.getApprovalId()))
            .map(ApprovalEntity::toDomain);
    }

    @Override
    public void saveIdempotencyKey(String idempotencyKey, UUID approvalId) {
        IdempotencyKeyEntity entity = new IdempotencyKeyEntity(
            idempotencyKey,
            approvalId
        );
        idempotencyRepo.save(entity);
    }
}

interface SpringDataApprovalRepository extends JpaRepository<ApprovalEntity, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM ApprovalEntity a WHERE a.id = :id")
    Optional<ApprovalEntity> findByIdWithLock(UUID id);

    List<ApprovalEntity> findByResourceId(String resourceId);
    List<ApprovalEntity> findByStatus(ApprovalStatus status);
}

interface SpringDataIdempotencyRepository extends JpaRepository<IdempotencyKeyEntity, String> {
    boolean existsByIdempotencyKey(String idempotencyKey);
    Optional<IdempotencyKeyEntity> findByIdempotencyKey(String idempotencyKey);
}