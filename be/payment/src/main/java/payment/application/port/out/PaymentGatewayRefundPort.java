package payment.application.port.out;

import java.math.BigDecimal;
import java.util.UUID;

public interface PaymentGatewayRefundPort {

    GatewayRefundResult refund(RefundRequest request);

    record RefundRequest(UUID refundId, UUID bookingId, BigDecimal amount, String currency) {
    }

    record GatewayRefundResult(String gatewayRefundId) {
    }
}
