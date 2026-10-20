package com.phase0demo.reject.adapter.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface JpaApprovalRepository extends JpaRepository<ApprovalEntity, UUID> {
}
