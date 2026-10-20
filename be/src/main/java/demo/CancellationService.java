package demo;

public class CancellationService {
    public boolean cancel(String bookingId) {
        // Demo fallback implementation (BACKEND's LLM call was unavailable).
        return bookingId != null && !bookingId.isBlank();
    }
}
