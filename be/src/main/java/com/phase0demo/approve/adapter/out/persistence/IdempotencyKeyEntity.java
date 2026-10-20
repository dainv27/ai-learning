package com.phase0demo.approve.adapter.out.persistence;

import jakarta.persistence.*;

import java.util.UUID;

@Entity
@Table(name = "idempotency_keys")
public class IdempotencyKeyEntity {
    @Id
    private String idempotencyKey;

    @Column(nullable = false)
    private UUID approvalId;

    protected IdempotencyKeyEntity() {}

    public IdempotencyKeyEntity(String idempotencyKey, UUID approvalId) {
        this.idempotencyKey = idempotencyKey;
        this.approvalId = approvalId;
    }

    public String getIdempotencyKey() { return idempotencyKey; }
    public UUID getApprovalId() { return approvalId; }
}