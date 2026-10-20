package payment.adapter.out.paymentgateway;

import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import payment.application.port.out.PaymentGatewayRefundPort;
import payment.application.port.out.PaymentGatewayRefundPort.GatewayRefundResult;
import payment.application.port.out.PaymentGatewayRefundPort.RefundRequest;

@Component
public class PaymentGatewayHttpAdapter implements PaymentGatewayRefundPort {

    private final RestTemplate restTemplate;
    private final String gatewayRefundUrl;

    public PaymentGatewayHttpAdapter(RestTemplate restTemplate,
                                     @Value("${payment.gateway.refund-url:http://localhost:8081/refunds}") String gatewayRefundUrl) {
        this.restTemplate = restTemplate;
        this.gatewayRefundUrl = gatewayRefundUrl;
    }

    @Override
    public GatewayRefundResult refund(RefundRequest request) {
        GatewayRefundResponse response = restTemplate.postForObject(
                gatewayRefundUrl, request, GatewayRefundResponse.class);
        if (response == null || response.refundId() == null) {
            throw new IllegalStateException("Payment gateway returned no refund id");
        }
        return new GatewayRefundResult(response.refundId());
    }

    private record GatewayRefundResponse(UUID refundId) {
    }
}
