package com.example.booking.payment.service;

import com.example.booking.payment.dto.CancelBookingResponseDto;
import com.example.booking.payment.port.BookingStatusPort;
import com.example.booking.payment.port.BookingUpdatePort;
import com.example.booking.payment.port.RefundPort;
import com.example.booking.payment.repository.RefundRepository;
import com.example.booking.payment.entity.RefundEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class CancelBookingService {

    private final BookingStatusPort bookingStatusPort;
    private final BookingUpdatePort bookingUpdatePort;
    private final RefundPort refundPort;
    private final RefundRepository refundRepository;

    public CancelBookingService(BookingStatusPort bookingStatusPort,
                                BookingUpdatePort bookingUpdatePort,
                                RefundPort refundPort,
                                RefundRepository refundRepository) {
        this.bookingStatusPort = bookingStatusPort;
        this.bookingUpdatePort = bookingUpdatePort;
        this.refundPort = refundPort;
        this.refundRepository = refundRepository;
    }

    @Transactional
    public CancelBookingResponseDto cancelBooking(String bookingId, String reason) {
        // Validate booking exists and is in cancellable state
        boolean exists = bookingStatusPort.bookingExists(bookingId);
        if (!exists) {
            throw new IllegalStateException("Booking not found: " + bookingId);
        }
        String currentStatus = bookingStatusPort.getBookingStatus(bookingId);
        if (!isCancellable(currentStatus)) {
            throw new IllegalStateException("Booking not cancellable in status: " + currentStatus);
        }

        // Trigger refund through payment gateway adapter
        String refundId = refundPort.refund(bookingId, reason);

        // Persist refund details
        RefundEntity refundEntity = new RefundEntity();
        refundEntity.setBookingId(bookingId);
        refundEntity.setRefundId(refundId);
        refundEntity.setStatus("PENDING");
        refundEntity.setReason(reason);
        refundEntity.setCreatedAt(LocalDateTime.now());
        refundRepository.save(refundEntity);

        // Update booking status to CANCELLED
        bookingUpdatePort.updateBookingStatus(bookingId, "CANCELLED");

        return new CancelBookingResponseDto(bookingId, refundId, "PENDING", "Booking cancellation initiated");
    }

    private boolean isCancellable(String status) {
        return "CONFIRMED".equals(status) || "PENDING".equals(status);
    }
}
