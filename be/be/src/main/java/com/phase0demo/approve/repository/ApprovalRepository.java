package com.phase0demo.approve.repository;

import com.phase0demo.approve.domain.Approval;
import com.phase0demo.approve.domain.ApprovalStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ApprovalRepository extends JpaRepository<Approval, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Approval a WHERE a.id = :id")
    Optional<Approval> findByIdForUpdate(@Param("id") UUID id);

    List<Approval> findByResourceTypeAndResourceId(String resourceType, String resourceId);

    List<Approval> findByStatus(ApprovalStatus status);

    List<Approval> findByRequesterId(String requesterId);
}
