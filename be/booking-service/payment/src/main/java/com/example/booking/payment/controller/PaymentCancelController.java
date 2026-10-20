package com.example.booking.payment.controller;

import com.example.booking.payment.dto.CancelBookingRequestDto;
import com.example.booking.payment.dto.CancelBookingResponseDto;
import com.example.booking.payment.service.CancelBookingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/bookings")
public class PaymentCancelController {

    private final CancelBookingService cancelBookingService;

    public PaymentCancelController(CancelBookingService cancelBookingService) {
        this.cancelBookingService = cancelBookingService;
    }

    @PostMapping("/{bookingId}/cancel")
    public ResponseEntity<CancelBookingResponseDto> cancelBooking(
            @PathVariable String bookingId,
            @RequestBody CancelBookingRequestDto request) {
        CancelBookingResponseDto response = cancelBookingService.cancelBooking(bookingId, request.reason());
        return ResponseEntity.ok(response);
    }
}
