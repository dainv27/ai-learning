package payment.adapter.in.rest.generated;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.util.UUID;
import payment.domain.model.Refund;
import payment.domain.model.RefundStatus;

public class RefundResponse {

    @JsonProperty("refundId")
    private UUID refundId;

    @JsonProperty("bookingId")
    private UUID bookingId;

    @JsonProperty("idempotencyKey")
    private UUID idempotencyKey;

    @JsonProperty("amount")
    private BigDecimal amount;

    @JsonProperty("currency")
    private String currency;

    @JsonProperty("status")
    private RefundStatus status;

    @JsonProperty("failureReason")
    private String failureReason;

    public static RefundResponse from(Refund refund) {
        RefundResponse response = new RefundResponse();
        response.refundId = refund.getId();
        response.bookingId = refund.getBookingId();
        response.idempotencyKey = refund.getIdempotencyKey();
        response.amount = refund.getAmount();
        response.currency = refund.getCurrency();
        response.status = refund.getStatus();
        response.failureReason = refund.getFailureReason();
        return response;
    }

    public UUID getRefundId() {
        return refundId;
    }

    public void setRefundId(UUID refundId) {
        this.refundId = refundId;
    }

    public UUID getBookingId() {
        return bookingId;
    }

    public void setBookingId(UUID bookingId) {
        this.bookingId = bookingId;
    }

    public UUID getIdempotencyKey() {
        return idempotencyKey;
    }

    public void setIdempotencyKey(UUID idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public RefundStatus getStatus() {
        return status;
    }

    public void setStatus(RefundStatus status) {
        this.status = status;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public void setFailureReason(String failureReason) {
        this.failureReason = failureReason;
    }
}
