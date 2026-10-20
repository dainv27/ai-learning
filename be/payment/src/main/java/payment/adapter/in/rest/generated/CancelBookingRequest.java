package payment.adapter.in.rest.generated;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

public class CancelBookingRequest {

    @JsonProperty("idempotencyKey")
    private UUID idempotencyKey;

    public CancelBookingRequest() {
    }

    public CancelBookingRequest(UUID idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }

    public UUID getIdempotencyKey() {
        return idempotencyKey;
    }

    public void setIdempotencyKey(UUID idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }
}
