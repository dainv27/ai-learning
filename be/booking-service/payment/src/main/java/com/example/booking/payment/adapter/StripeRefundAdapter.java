package com.example.booking.payment.adapter;

import com.example.booking.payment.port.RefundPort;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class StripeRefundAdapter implements RefundPort {

    @Override
    public String refund(String bookingId, String reason) {
        // In a real implementation, this would call Stripe's API.
        // For now, simulate a successful refund creation.
        return "re_" + UUID.randomUUID().toString().replace("-", "");
    }
}
