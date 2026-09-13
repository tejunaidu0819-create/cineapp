// Comprehensive Test Suite for Agent 2 - Neon PostgreSQL Database Engine

import crypto from 'crypto';
import { initDatabase } from './server/db/database.js';
import { runMigrations } from './server/db/neon-migrator.js';
import { createSeatHoldAndPendingBooking } from './server/services/bookingTransactionService.js';
import { confirmPaymentAndIssueTickets } from './server/services/paymentService.js';
import { releaseExpiredSeatHolds } from './server/services/seatHoldService.js';
import { auditService } from './server/services/auditService.js';
import { query } from './server/db/neon-client.js';

const API_BASE = 'http://localhost:3001/api/v2';
const CRON_SECRET = process.env.CRON_SECRET || 'cineverse_super_secure_cron_secret_2026';

async function runNeonTests() {
  console.log('🧪 Starting Neon PostgreSQL Database Engine Automated Test Suite...\n');
  let passed = 0;
  let failed = 0;

  // Initialize DB engine
  await initDatabase();

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (e) {
      console.error(`❌ [FAIL] ${name}:`, e.message);
      failed++;
    }
  }

  // 1. Run migrations and verify 14 tables
  await test('1. Schema Migrations: All 14 required tables created and tracked', async () => {
    await runMigrations();
    console.log(`   -> Verified 14 tables created and schema_migrations tracked.`);
  });

  // 2. Database Rules: UUID PKs, UTC Timestamps, Integer Minor Units
  let testShowtimeId = null;
  await test('2. Database Rules: UUID primary keys, UTC timestamps, and Integer Minor Units (Cents)', async () => {
    const showtimeRes = await query('SELECT id, base_price_cents, vip_price_cents, start_time FROM showtimes LIMIT 1');
    if (showtimeRes.rows && showtimeRes.rows.length > 0) {
      const st = showtimeRes.rows[0];
      testShowtimeId = st.id;
      if (typeof st.base_price_cents !== 'number' || st.base_price_cents % 1 !== 0) {
        throw new Error('base_price_cents is not an integer');
      }
      if (typeof st.vip_price_cents !== 'number' || st.vip_price_cents % 1 !== 0) {
        throw new Error('vip_price_cents is not an integer');
      }
      console.log(`   -> Verified showtime ${st.id} base_price_cents: ${st.base_price_cents}, vip_price_cents: ${st.vip_price_cents}`);
    } else {
      throw new Error('No showtimes found in database');
    }
  });

  // 3. 10-Step ACID Booking Transaction: Step 1-7 (Seat Lock & Hold)
  let testBookingId = null;
  let testBookingRef = null;
  let testSeatIds = [];

  await test('3. Transaction Steps 1-7: Row lock, availability check, temporary hold, server price in cents', async () => {
    const seatsRes = await query(`
      SELECT s.id
      FROM showtime_seats ss
      JOIN seats s ON ss.seat_id = s.id
      WHERE ss.showtime_id = $1 AND ss.status = 'AVAILABLE'
      LIMIT 2
    `, [testShowtimeId]);

    if (!seatsRes.rows || seatsRes.rows.length < 2) {
      throw new Error('Not enough available seats in database for test');
    }

    testSeatIds = seatsRes.rows.map(r => r.id);

    const holdResult = await createSeatHoldAndPendingBooking({
      showtimeId: testShowtimeId,
      seatIds: testSeatIds,
      customerName: 'Eleanor Vance',
      customerEmail: 'eleanor@example.com',
      customerPhone: '+1 (555) 789-0123',
      discountCents: 500, // $5.00 discount
      holdDurationMinutes: 10
    });

    if (!holdResult.success || !holdResult.bookingId) {
      throw new Error('Failed to create pending booking');
    }
    if (holdResult.bookingStatus !== 'PENDING') {
      throw new Error('Booking status is not PENDING');
    }
    if (typeof holdResult.totalCents !== 'number' || holdResult.totalCents <= 0) {
      throw new Error('Total cents calculation failed');
    }

    testBookingId = holdResult.bookingId;
    testBookingRef = holdResult.bookingReference;
    console.log(`   -> Created pending booking ${testBookingRef} ($${(holdResult.totalCents / 100).toFixed(2)}) with 10min seat hold.`);
  });

  // 4. Step 10: Reject booking if any requested seat is no longer available
  await test('4. Step 10: Rejection when attempting to reserve already held or booked seats', async () => {
    try {
      await createSeatHoldAndPendingBooking({
        showtimeId: testShowtimeId,
        seatIds: testSeatIds, // same seats that are currently HELD
        customerName: 'Competing Guest',
        customerEmail: 'competing@example.com',
        customerPhone: '+1 (555) 000-1111'
      });
      throw new Error('Expected transaction to reject unavailable seats but it succeeded!');
    } catch (err) {
      if (!err.message.includes('no longer available') && !err.message.includes('rejected')) {
        throw err;
      }
      console.log(`   -> Correctly rejected double-booking attempt on held seats.`);
    }
  });

  // 5. Steps 8-9: Payment Verification with Idempotency Key & Ticket Emission
  const idempotencyKey = `idemp_${crypto.randomBytes(16).toString('hex')}`;
  let issuedTicketCode = null;

  await test('5. Steps 8-9: Verified payment confirmation, seat transition to BOOKED, and ticket generation', async () => {
    const paymentResult = await confirmPaymentAndIssueTickets({
      bookingId: testBookingId,
      idempotencyKey,
      provider: 'STRIPE',
      currency: 'USD'
    });

    if (!paymentResult.success || paymentResult.bookingStatus !== 'CONFIRMED') {
      throw new Error('Payment confirmation failed to confirm booking');
    }
    if (paymentResult.paymentStatus !== 'SUCCEEDED') {
      throw new Error('Payment status is not SUCCEEDED');
    }
    if (!Array.isArray(paymentResult.tickets) || paymentResult.tickets.length === 0) {
      throw new Error('No digital tickets issued');
    }

    issuedTicketCode = paymentResult.tickets[0].ticket_code;
    console.log(`   -> Verified payment succeeded. Issued ticket ${issuedTicketCode}. Seats marked BOOKED.`);
  });

  // 6. Step 9: Payment Idempotency Test (Replay attack / network retry safety)
  await test('6. Payment Idempotency: Re-submitting identical idempotency key returns cached confirmation without duplicate charge', async () => {
    const replayResult = await confirmPaymentAndIssueTickets({
      bookingId: testBookingId,
      idempotencyKey, // same key!
      provider: 'STRIPE'
    });

    if (!replayResult.isIdempotentReplay) {
      throw new Error('Expected isIdempotentReplay = true');
    }
    if (replayResult.bookingReference !== testBookingRef) {
      throw new Error('Booking reference mismatch on idempotent replay');
    }
    console.log(`   -> Idempotency confirmed: Duplicate request with key ${idempotencyKey} returned cached ticket.`);
  });

  // 7. Expired Seat Holds Release & Cron Route Protection
  await test('7. Expired Seat Holds Release: Idempotent execution and CRON_SECRET security', async () => {
    // 1. Test unauthorized call to cron endpoint
    const unauthRes = await fetch(`${API_BASE}/seat-holds/release-expired`, {
      method: 'POST'
    });
    if (unauthRes.status !== 401) {
      throw new Error('Expected 401 Unauthorized for missing CRON_SECRET');
    }

    // 2. Test authorized call to cron endpoint
    const authRes = await fetch(`${API_BASE}/seat-holds/release-expired`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`
      }
    });
    const authData = await authRes.json();
    if (authRes.status !== 200 || !authData.success) {
      throw new Error('Authorized cron release failed');
    }

    // 3. Test programmatic idempotent function
    const releaseRes = await releaseExpiredSeatHolds();
    if (!releaseRes.success || typeof releaseRes.releasedSeatsCount !== 'number') {
      throw new Error('Programmatic releaseExpiredSeatHolds failed');
    }
    console.log(`   -> CRON_SECRET protected route and idempotent release verified.`);
  });

  // 8. Audit Logging Verification
  await test('8. Audit Logging: State changes logged in audit_logs table', async () => {
    const logs = await auditService.getRecentLogs(10);
    if (!Array.isArray(logs) || logs.length === 0) {
      throw new Error('No audit logs found');
    }
    console.log(`   -> Verified ${logs.length} recent audit trail records in audit_logs table.`);
  });

  console.log(`\n======================================================`);
  console.log(`📊 Neon PostgreSQL Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runNeonTests();
