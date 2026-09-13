import express from 'express';
import { createSeatHoldAndPendingBooking } from '../services/bookingTransactionService.js';
import { confirmPaymentAndIssueTickets } from '../services/paymentService.js';
import { releaseExpiredSeatHolds, verifyCronSecret } from '../services/seatHoldService.js';
import { auditService } from '../services/auditService.js';
import { query, transaction } from '../db/neon-client.js';

const router = express.Router();

/**
 * 1. Step 1-7: Create Temporary Seat Hold & Pending Booking
 */
router.post('/bookings/hold', async (req, res) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const result = await createSeatHoldAndPendingBooking({
      ...req.body,
      ipAddress
    });
    res.status(201).json(result);
  } catch (error) {
    console.error('Seat hold error:', error);
    res.status(400).json({ error: error.message || 'Failed to create seat hold' });
  }
});

/**
 * 2. Step 8-9: Confirm Payment & Issue Tickets (Idempotent)
 */
router.post('/payments/confirm', async (req, res) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const { bookingId, idempotencyKey, provider, providerTransactionId, amountCents, currency } = req.body;

    const result = await confirmPaymentAndIssueTickets({
      bookingId,
      idempotencyKey,
      provider,
      providerTransactionId,
      amountCents,
      currency,
      ipAddress
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(400).json({ error: error.message || 'Payment confirmation failed' });
  }
});

/**
 * 3. Secure Idempotent Cron Route: Release Expired Seat Holds
 * Protected by CRON_SECRET header
 */
router.post('/seat-holds/release-expired', verifyCronSecret, async (req, res) => {
  try {
    const result = await releaseExpiredSeatHolds();
    res.status(200).json({
      success: true,
      message: `Released ${result.releasedSeatsCount} expired seat hold(s) and expired ${result.expiredBookingsCount} booking(s).`,
      ...result
    });
  } catch (error) {
    console.error('Release expired seat holds error:', error);
    res.status(500).json({ error: error.message || 'Failed to release expired seat holds' });
  }
});

/**
 * 4. Verify Digital Ticket Code
 */
router.get('/tickets/verify/:ticketCode', async (req, res) => {
  try {
    const { ticketCode } = req.params;
    const ticketRes = await query(`
      SELECT 
        t.*,
        b.booking_reference,
        b.customer_name,
        b.booking_status,
        m.title as movie_title,
        c.name as cinema_name,
        a.name as auditorium_name,
        st.start_time,
        st.format_type,
        s.row_label,
        s.seat_num,
        bi.seat_tier
      FROM tickets t
      JOIN bookings b ON t.booking_id = b.id
      JOIN booking_items bi ON t.booking_item_id = bi.id
      JOIN seats s ON bi.seat_id = s.id
      JOIN showtimes st ON b.showtime_id = st.id
      JOIN movies m ON st.movie_id = m.id
      JOIN auditoriums a ON st.auditorium_id = a.id
      JOIN cinemas c ON a.cinema_id = c.id
      WHERE UPPER(t.ticket_code) = UPPER($1)
    `, [ticketCode.trim()]);

    if (!ticketRes.rows || ticketRes.rows.length === 0) {
      return res.status(404).json({ valid: false, message: `Ticket code ${ticketCode} not found.` });
    }

    const ticket = ticketRes.rows[0];

    if (ticket.status !== 'VALID' || ticket.booking_status !== 'CONFIRMED') {
      return res.json({
        valid: false,
        status: ticket.status,
        message: `Ticket ${ticketCode} is ${ticket.status} (Booking is ${ticket.booking_status}). Entry denied.`,
        ticket
      });
    }

    res.json({
      valid: true,
      status: 'VALID',
      message: `Ticket verified successfully! Welcome ${ticket.customer_name}.`,
      ticket
    });
  } catch (error) {
    console.error('Ticket verification error:', error);
    res.status(500).json({ error: 'Failed to verify ticket' });
  }
});

/**
 * 5. Retrieve Audit Logs
 */
router.get('/audit-logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || 50, 10);
    const logs = await auditService.getRecentLogs(limit);
    res.json(logs);
  } catch (error) {
    console.error('Audit log fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

/**
 * 6. Refund Booking & Release Seats
 */
router.post('/bookings/:id/refund', async (req, res) => {
  try {
    const bookingId = req.params.id;

    const result = await transaction(async (client) => {
      // 1. Lock booking
      const bookingRes = await client.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [bookingId]);
      if (!bookingRes.rows || bookingRes.rows.length === 0) {
        throw new Error('Booking not found.');
      }
      const booking = bookingRes.rows[0];

      if (booking.booking_status === 'REFUNDED') {
        throw new Error('Booking has already been refunded.');
      }

      // 2. Update booking status
      await client.query(`
        UPDATE bookings
        SET booking_status = 'REFUNDED', cancelled_at = (now() AT TIME ZONE 'utc'), updated_at = (now() AT TIME ZONE 'utc')
        WHERE id = $1
      `, [bookingId]);

      // 3. Update payment status
      await client.query(`
        UPDATE payments
        SET status = 'REFUNDED', updated_at = (now() AT TIME ZONE 'utc')
        WHERE booking_id = $1
      `, [bookingId]);

      // 4. Release showtime seats back to AVAILABLE
      const itemsRes = await client.query('SELECT showtime_seat_id FROM booking_items WHERE booking_id = $1', [bookingId]);
      const seatIds = (itemsRes.rows || []).map(r => r.showtime_seat_id);

      if (seatIds.length > 0) {
        const placeholders = seatIds.map((_, i) => `$${i + 1}`).join(',');
        await client.query(`
          UPDATE showtime_seats
          SET status = 'AVAILABLE', hold_expires_at = NULL, updated_at = (now() AT TIME ZONE 'utc')
          WHERE id IN (${placeholders})
        `, seatIds);
      }

      // 5. Invalidate tickets
      await client.query(`
        UPDATE tickets
        SET status = 'CANCELLED'
        WHERE booking_id = $1
      `, [bookingId]);

      // 6. Audit log
      await client.query(`
        INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, new_state)
        VALUES ('BOOKING', $1, 'BOOKING_REFUNDED', 'ADMIN', $2)
      `, [
        bookingId,
        JSON.stringify({
          bookingReference: booking.booking_reference,
          refundedAmountCents: booking.total_cents
        })
      ]);

      return {
        success: true,
        message: `Booking ${booking.booking_reference} has been successfully refunded ($${(booking.total_cents / 100).toFixed(2)}) and seats released.`,
        bookingReference: booking.booking_reference,
        refundedCents: booking.total_cents
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Refund error:', error);
    res.status(400).json({ error: error.message || 'Failed to refund booking' });
  }
});

export default router;
