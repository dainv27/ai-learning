package payment.domain.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public class Refund {

    private final UUID id;
    private final UUID bookingId;
    private final UUID paymentId;
    private final BigDecimal amount;
    private final String currency;
    private final UUID idempotencyKey;
    private RefundStatus status;
    private String failureReason;
    private String gatewayRefundId;
    private final Instant createdAt;
    private Instant updatedAt;

    public Refund(UUID id, UUID bookingId, UUID paymentId, BigDecimal amount, String currency,
                  UUID idempotencyKey, RefundStatus status, String failureReason,
                  String gatewayRefundId, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.bookingId = bookingId;
        this.paymentId = paymentId;
        this.amount = amount;
        this.currency = currency;
        this.idempotencyKey = idempotencyKey;
        this.status = status;
        this.failureReason = failureReason;
        this.gatewayRefundId = gatewayRefundId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static Refund createPending(UUID bookingId, UUID paymentId, BigDecimal amount,
                                       String currency, UUID idempotencyKey) {
        Instant now = Instant.now();
        return new Refund(UUID.randomUUID(), bookingId, paymentId, amount, currency, idempotencyKey,
                RefundStatus.PENDING, null, null, now, now);
    }

    public void complete(String gatewayRefundId) {
        this.status = RefundStatus.COMPLETED;
        this.gatewayRefundId = gatewayRefundId;
        this.failureReason = null;
        this.updatedAt = Instant.now();
    }

    public void fail(String reason) {
        this.status = RefundStatus.FAILED;
        this.failureReason = reason;
        this.updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getBookingId() {
        return bookingId;
    }

    public UUID getPaymentId() {
        return paymentId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getCurrency() {
        return currency;
    }

    public UUID getIdempotencyKey() {
        return idempotencyKey;
    }

    public RefundStatus getStatus() {
        return status;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public String getGatewayRefundId() {
        return gatewayRefundId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
