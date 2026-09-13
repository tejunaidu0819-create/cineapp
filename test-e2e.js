// Automated End-to-End Test Suite for CineVerse API & Database

const API_BASE = 'http://localhost:3001/api';

async function runTests() {
  console.log('🧪 Starting CineVerse API & Database Automated Test Suite...\n');
  let passed = 0;
  let failed = 0;

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

  // 1. Movies endpoint & Filters
  await test('GET /api/movies returns movies and supports search & filters', async () => {
    const res = await fetch(`${API_BASE}/movies`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('No movies returned');
    
    // Test search filter
    const searchRes = await fetch(`${API_BASE}/movies?search=Dune`);
    const searchData = await searchRes.json();
    if (searchData.length === 0 || !searchData[0].title.includes('Dune')) {
      throw new Error('Search query filter failed');
    }

    // Test genre filter
    const genreRes = await fetch(`${API_BASE}/movies?genre=Action`);
    const genreData = await genreRes.json();
    if (genreData.length === 0) throw new Error('Genre filter failed');
  });

  // 2. Movie Details & Reviews
  let sampleMovieId = null;
  await test('GET /api/movies/:id returns movie with showtimes and reviews', async () => {
    const moviesRes = await fetch(`${API_BASE}/movies`);
    const movies = await moviesRes.json();
    sampleMovieId = movies[0].id;

    const res = await fetch(`${API_BASE}/movies/${sampleMovieId}`);
    const data = await res.json();
    if (!data.title || !Array.isArray(data.showtimes)) throw new Error('Invalid movie details structure');
    if (data.showtimes.length === 0) throw new Error('Movie has no showtimes');
  });

  // 3. Cinemas endpoint
  let sampleCinemaId = null;
  await test('GET /api/cinemas returns cinema complexes with amenities', async () => {
    const res = await fetch(`${API_BASE}/cinemas`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('No cinemas returned');
    if (!data[0].amenities) throw new Error('Cinema amenities missing');
    sampleCinemaId = data[0].id;
  });

  // 4. Showtimes endpoint & Seat Map with accurate availability
  let sampleShowtimeId = null;
  let selectedSeatsToBook = [];
  await test('GET /api/showtimes/:id/seats returns accurate seat grid and availability', async () => {
    const stRes = await fetch(`${API_BASE}/showtimes`);
    const showtimes = await stRes.json();
    if (showtimes.length === 0) throw new Error('No showtimes found');
    sampleShowtimeId = showtimes[0].id;

    const res = await fetch(`${API_BASE}/showtimes/${sampleShowtimeId}/seats`);
    const data = await res.json();
    if (!data.rows || !Array.isArray(data.seats)) throw new Error('Invalid seat map structure');
    if (data.availableSeats <= 0) throw new Error('No available seats found');

    // Pick 2 available seats
    const available = data.seats.filter(s => !s.isBooked);
    if (available.length < 2) throw new Error('Not enough available seats to test booking');
    selectedSeatsToBook = [available[0], available[1]];
  });

  // 5. Concessions
  let sampleConcession = null;
  await test('GET /api/concessions returns gourmet cinema snacks', async () => {
    const res = await fetch(`${API_BASE}/concessions`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('No concessions returned');
    sampleConcession = data[0];
  });

  // 6. Create Booking transaction & QR generation
  let createdBookingRef = null;
  let createdBookingId = null;
  await test('POST /api/bookings creates booking, calculates fees & promo, and generates QR code', async () => {
    const payload = {
      showtimeId: sampleShowtimeId,
      seats: selectedSeatsToBook,
      customerName: 'Integration Tester',
      customerEmail: 'tester@cineapp.com',
      customerPhone: '+1 (555) 999-0000',
      paymentMethod: 'CREDIT_CARD',
      concessions: [{ id: sampleConcession.id, quantity: 1, price: sampleConcession.price }],
      discountAmount: 5.00
    };

    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok || !data.success || !data.booking) throw new Error(data.error || 'Booking creation failed');
    if (!data.booking.bookingReference.startsWith('CNV-')) throw new Error('Invalid booking reference format');
    if (!data.booking.qrCodeDataUrl.startsWith('data:image/png;base64,')) throw new Error('Invalid QR code data URL');

    createdBookingRef = data.booking.bookingReference;
    createdBookingId = data.booking.bookingId;
  });

  // 7. Verify seat map now marks those seats as booked
  await test('GET /api/showtimes/:id/seats reflects newly booked seats in real-time', async () => {
    const res = await fetch(`${API_BASE}/showtimes/${sampleShowtimeId}/seats`);
    const data = await res.json();
    const bookedIds = data.seats.filter(s => s.isBooked).map(s => s.id);
    for (const s of selectedSeatsToBook) {
      if (!bookedIds.includes(s.id)) {
        throw new Error(`Seat ${s.row_label}${s.seat_num} is not marked as booked!`);
      }
    }
  });

  // 8. Guest Lookup by Reference & Email
  await test('GET /api/bookings/lookup retrieves full ticket pass data by reference and email', async () => {
    const res = await fetch(`${API_BASE}/bookings/lookup?reference=${createdBookingRef}&email=tester@cineapp.com`);
    const data = await res.json();
    if (!data.booking_reference || data.booking_reference !== createdBookingRef) {
      throw new Error('Lookup booking reference mismatch');
    }
    if (!Array.isArray(data.seats) || data.seats.length !== selectedSeatsToBook.length) {
      throw new Error('Lookup seats count mismatch');
    }
    if (!Array.isArray(data.concessions) || data.concessions.length === 0) {
      throw new Error('Lookup concessions missing');
    }
  });

  // 9. QR Scanner Usher Verification Endpoint
  await test('POST /api/admin/verify-ticket validates ticket with reference or QR string', async () => {
    const res = await fetch(`${API_BASE}/admin/verify-ticket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: createdBookingRef })
    });
    const data = await res.json();
    if (!data.valid || data.status !== 'VALID') throw new Error(`Ticket verification failed: ${data.message}`);
    if (data.booking.customer_name !== 'Integration Tester') throw new Error('Ticket customer name mismatch');
  });

  // 10. Booking Cancellation & Seat Release
  await test('POST /api/bookings/:id/cancel cancels booking, records timestamp and releases seats', async () => {
    const res = await fetch(`${API_BASE}/bookings/${createdBookingId}/cancel`, {
      method: 'POST'
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Cancellation failed');

    // Verify booking is now marked CANCELLED
    const lookupRes = await fetch(`${API_BASE}/bookings/lookup?reference=${createdBookingRef}`);
    const lookupData = await lookupRes.json();
    if (lookupData.booking_status !== 'CANCELLED') throw new Error('Status is not CANCELLED');

    // Verify seats are released
    const seatMapRes = await fetch(`${API_BASE}/showtimes/${sampleShowtimeId}/seats`);
    const seatMapData = await seatMapRes.json();
    const bookedIds = seatMapData.seats.filter(s => s.isBooked).map(s => s.id);
    for (const s of selectedSeatsToBook) {
      if (bookedIds.includes(s.id)) {
        throw new Error(`Seat ${s.row_label}${s.seat_num} was not released after cancellation!`);
      }
    }
  });

  // 11. Admin Stats & Occupancy Calculation
  await test('GET /api/admin/stats computes live revenue, occupancy rate and recent transactions', async () => {
    const res = await fetch(`${API_BASE}/admin/stats`);
    const data = await res.json();
    if (typeof data.totalRevenue !== 'number') throw new Error('totalRevenue is missing');
    if (typeof data.totalBookings !== 'number') throw new Error('totalBookings is missing');
    if (!data.occupancyRate) throw new Error('occupancyRate is missing');
    if (!Array.isArray(data.topMovies) || !Array.isArray(data.recentBookings)) {
      throw new Error('topMovies or recentBookings is missing');
    }
  });

  // 12. Authentication endpoints
  await test('POST /api/auth/login and POST /api/auth/register work properly', async () => {
    // Test login
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@cineverse.com', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok || loginData.user.role !== 'admin') throw new Error('Admin login failed');

    // Test register new user
    const randomEmail = `user_${Date.now()}@cineapp.com`;
    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: randomEmail,
        password: 'password123',
        fullName: 'New User Test',
        phone: '+1 (555) 123-4567'
      })
    });
    const regData = await regRes.json();
    if (!regRes.ok || !regData.user.id) throw new Error('Registration failed');
  });

  console.log(`\n========================================`);
  console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
