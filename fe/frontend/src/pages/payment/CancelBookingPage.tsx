import React, { useState } from 'react';
import { cancelBooking, CancelBookingResponse } from '../../services/paymentService';

const CancelBookingPage: React.FC = () => {
  const [bookingId, setBookingId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CancelBookingResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingId.trim() || !reason.trim()) {
      setError('Both booking ID and cancel reason are required.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await cancelBooking(bookingId.trim(), reason.trim());
      setResult(response);
    } catch (err: any) {
      setError(err.message || 'An error occurred while cancelling the booking.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Cancel Booking</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="bookingId">Booking ID:</label>
          <input
            type="text"
            id="bookingId"
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="reason">Cancel Reason:</label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Cancelling...' : 'Cancel Booking'}
        </button>
      </form>
      {error && <div className="error">{error}</div>}
      {result && (
        <div className="success">
          <h2>Booking Cancelled</h2>
          <p>Booking ID: {result.bookingId}</p>
          <p>Refund Status: {result.refundStatus}</p>
          {result.refundTransactionId && (
            <p>Refund Transaction ID: {result.refundTransactionId}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default CancelBookingPage;
