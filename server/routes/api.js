import express from 'express';
import QRCode from 'qrcode';
import { db } from '../db/database.js';

const router = express.Router();

// Helper to generate unique reference code
function generateReference() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'CNV-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// -------------------------------------------------------------
// MOVIES ENDPOINTS
// -------------------------------------------------------------
router.get('/movies', (req, res) => {
  try {
    const { search, genre, language, cinemaId, date, trending, comingSoon } = req.query;

    let query = `
      SELECT DISTINCT m.*
      FROM movies m
    `;
    const params = [];
    const conditions = ['m.is_active = 1'];

    if (cinemaId || date) {
      query += ` JOIN showtimes s ON m.id = s.movie_id JOIN halls h ON s.hall_id = h.id`;
    }

    if (cinemaId) {
      conditions.push('h.cinema_id = ?');
      params.push(Number(cinemaId));
    }

    if (date) {
      conditions.push("date(s.start_time) = date(?)");
      params.push(date);
    }

    if (search) {
      conditions.push('(m.title LIKE ? OR m.director LIKE ? OR m.cast_list LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    if (genre && genre !== 'All') {
      conditions.push('m.genre LIKE ?');
      params.push(`%${genre}%`);
    }

    if (language && language !== 'All') {
      conditions.push('m.language = ?');
      params.push(language);
    }

    if (trending === 'true') {
      conditions.push('m.is_trending = 1');
    }

    if (comingSoon === 'true') {
      conditions.push('m.is_coming_soon = 1');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY m.is_trending DESC, m.imdb_score DESC';

    const movies = db.prepare(query).all(...params);
    res.json(movies);
  } catch (error) {
    console.error('Error fetching movies:', error);
    res.status(500).json({ error: 'Failed to fetch movies' });
  }
});

router.get('/movies/:id', (req, res) => {
  try {
    const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(Number(req.params.id));
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    const reviews = db.prepare('SELECT * FROM reviews WHERE movie_id = ? ORDER BY id DESC').all(movie.id);

    const showtimes = db.prepare(`
      SELECT 
        s.*,
        h.name as hall_name,
        h.hall_type,
        c.id as cinema_id,
        c.name as cinema_name,
        c.city as cinema_city
      FROM showtimes s
      JOIN halls h ON s.hall_id = h.id
      JOIN cinemas c ON h.cinema_id = c.id
      WHERE s.movie_id = ? AND datetime(s.start_time) >= datetime('now', '-1 hour')
      ORDER BY s.start_time ASC
    `).all(movie.id);

    res.json({
      ...movie,
      reviews,
      showtimes
    });
  } catch (error) {
    console.error('Error fetching movie details:', error);
    res.status(500).json({ error: 'Failed to fetch movie details' });
  }
});

// -------------------------------------------------------------
// CINEMAS ENDPOINTS
// -------------------------------------------------------------
router.get('/cinemas', (req, res) => {
  try {
    const cinemas = db.prepare(`
      SELECT c.*, COUNT(h.id) as total_halls
      FROM cinemas c
      LEFT JOIN halls h ON c.id = h.cinema_id
      GROUP BY c.id
      ORDER BY c.name ASC
    `).all();
    res.json(cinemas);
  } catch (error) {
    console.error('Error fetching cinemas:', error);
    res.status(500).json({ error: 'Failed to fetch cinemas' });
  }
});

router.get('/cinemas/:id', (req, res) => {
  try {
    const cinema = db.prepare('SELECT * FROM cinemas WHERE id = ?').get(Number(req.params.id));
    if (!cinema) {
      return res.status(404).json({ error: 'Cinema not found' });
    }

    const halls = db.prepare('SELECT * FROM halls WHERE cinema_id = ?').all(cinema.id);

    const showtimes = db.prepare(`
      SELECT 
        s.*,
        m.title as movie_title,
        m.poster_url,
        m.genre,
        m.rating as movie_rating,
        m.duration_mins,
        h.name as hall_name,
        h.hall_type
      FROM showtimes s
      JOIN movies m ON s.movie_id = m.id
      JOIN halls h ON s.hall_id = h.id
      WHERE h.cinema_id = ? AND datetime(s.start_time) >= datetime('now', '-1 hour')
      ORDER BY s.start_time ASC
    `).all(cinema.id);

    res.json({
      ...cinema,
      halls,
      showtimes
    });
  } catch (error) {
    console.error('Error fetching cinema details:', error);
    res.status(500).json({ error: 'Failed to fetch cinema details' });
  }
});

// -------------------------------------------------------------
// SHOWTIMES & SEAT AVAILABILITY
// -------------------------------------------------------------
router.get('/showtimes', (req, res) => {
  try {
    const { movieId, cinemaId, date, format } = req.query;

    let query = `
      SELECT 
        s.*,
        m.title as movie_title,
        m.poster_url,
        m.genre,
        m.language,
        m.rating as movie_rating,
        m.duration_mins,
        h.name as hall_name,
        h.hall_type,
        c.id as cinema_id,
        c.name as cinema_name,
        c.city as cinema_city
      FROM showtimes s
      JOIN movies m ON s.movie_id = m.id
      JOIN halls h ON s.hall_id = h.id
      JOIN cinemas c ON h.cinema_id = c.id
    `;
    const params = [];
    const conditions = [];

    if (movieId) {
      conditions.push('s.movie_id = ?');
      params.push(Number(movieId));
    }

    if (cinemaId) {
      conditions.push('c.id = ?');
      params.push(Number(cinemaId));
    }

    if (date) {
      conditions.push("date(s.start_time) = date(?)");
      params.push(date);
    }

    if (format && format !== 'All') {
      conditions.push('s.format_type LIKE ?');
      params.push(`%${format}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY s.start_time ASC';

    const showtimes = db.prepare(query).all(...params);
    res.json(showtimes);
  } catch (error) {
    console.error('Error fetching showtimes:', error);
    res.status(500).json({ error: 'Failed to fetch showtimes' });
  }
});

router.get('/showtimes/:id', (req, res) => {
  try {
    const showtime = db.prepare(`
      SELECT 
        s.*,
        m.title as movie_title,
        m.synopsis,
        m.poster_url,
        m.backdrop_url,
        m.genre,
        m.language,
        m.duration_mins,
        m.rating as movie_rating,
        h.name as hall_name,
        h.hall_type,
        h.total_rows,
        h.total_cols,
        c.id as cinema_id,
        c.name as cinema_name,
        c.address as cinema_address,
        c.city as cinema_city
      FROM showtimes s
      JOIN movies m ON s.movie_id = m.id
      JOIN halls h ON s.hall_id = h.id
      JOIN cinemas c ON h.cinema_id = c.id
      WHERE s.id = ?
    `).get(Number(req.params.id));

    if (!showtime) {
      return res.status(404).json({ error: 'Showtime not found' });
    }

    res.json(showtime);
  } catch (error) {
    console.error('Error fetching showtime:', error);
    res.status(500).json({ error: 'Failed to fetch showtime' });
  }
});

router.get('/showtimes/:id/seats', (req, res) => {
  try {
    const showtimeId = Number(req.params.id);
    const showtime = db.prepare('SELECT * FROM showtimes WHERE id = ?').get(showtimeId);
    if (!showtime) {
      return res.status(404).json({ error: 'Showtime not found' });
    }

    // Get all seats for this hall
    const allSeats = db.prepare(`
      SELECT * FROM seats WHERE hall_id = ? ORDER BY row_label ASC, seat_num ASC
    `).all(showtime.hall_id);

    // Get currently booked seats for this showtime (only from active CONFIRMED bookings)
    const bookedItems = db.prepare(`
      SELECT bi.seat_id
      FROM booking_items bi
      JOIN bookings b ON bi.booking_id = b.id
      WHERE b.showtime_id = ? AND b.booking_status = 'CONFIRMED'
    `).all(showtimeId);

    const bookedSeatIds = new Set(bookedItems.map(b => b.seat_id));

    const mappedSeats = allSeats.map(seat => {
      const isBooked = bookedSeatIds.has(seat.id);
      let price = showtime.base_price;
      if (seat.seat_tier === 'vip') {
        price = showtime.vip_price;
      }

      return {
        ...seat,
        isBooked,
        price
      };
    });

    const rows = {};
    for (const seat of mappedSeats) {
      if (!rows[seat.row_label]) {
        rows[seat.row_label] = [];
      }
      rows[seat.row_label].push(seat);
    }

    const totalSeats = mappedSeats.length;
    const availableSeats = mappedSeats.filter(s => !s.isBooked).length;

    res.json({
      showtimeId,
      hallId: showtime.hall_id,
      totalSeats,
      availableSeats,
      basePrice: showtime.base_price,
      vipPrice: showtime.vip_price,
      rows,
      seats: mappedSeats
    });
  } catch (error) {
    console.error('Error fetching seat map:', error);
    res.status(500).json({ error: 'Failed to fetch seat map' });
  }
});

// -------------------------------------------------------------
// CONCESSIONS
// -------------------------------------------------------------
router.get('/concessions', (req, res) => {
  try {
    const concessions = db.prepare('SELECT * FROM concessions ORDER BY category ASC, price ASC').all();
    res.json(concessions);
  } catch (error) {
    console.error('Error fetching concessions:', error);
    res.status(500).json({ error: 'Failed to fetch concessions' });
  }
});

// -------------------------------------------------------------
// BOOKINGS & QR CODE GENERATOR
// -------------------------------------------------------------
router.post('/bookings', async (req, res) => {
  try {
    const {
      showtimeId,
      seats,
      customerName,
      customerEmail,
      customerPhone,
      paymentMethod = 'CREDIT_CARD',
      concessions = [],
      discountAmount = 0,
      userId = null
    } = req.body;

    if (!showtimeId || !seats || seats.length === 0) {
      return res.status(400).json({ error: 'Showtime and at least one seat must be selected.' });
    }

    if (!customerName || !customerEmail || !customerPhone) {
      return res.status(400).json({ error: 'Customer name, email, and phone are required.' });
    }

    const sId = Number(showtimeId);

    // 1. Verify showtime exists
    const showtime = db.prepare(`
      SELECT s.*, m.title as movie_title, h.name as hall_name, c.name as cinema_name
      FROM showtimes s
      JOIN movies m ON s.movie_id = m.id
      JOIN halls h ON s.hall_id = h.id
      JOIN cinemas c ON h.cinema_id = c.id
      WHERE s.id = ?
    `).get(sId);

    if (!showtime) {
      return res.status(400).json({ error: 'Invalid showtime selected.' });
    }

    // 2. Verify no requested seats are already booked
    const seatIds = seats.map(s => Number(s.id));
    const placeholders = seatIds.map(() => '?').join(',');
    
    const existingBookings = db.prepare(`
      SELECT bi.row_label, bi.seat_num
      FROM booking_items bi
      JOIN bookings b ON bi.booking_id = b.id
      WHERE b.showtime_id = ? AND b.booking_status = 'CONFIRMED' AND bi.seat_id IN (${placeholders})
    `).all(sId, ...seatIds);

    if (existingBookings.length > 0) {
      const taken = existingBookings.map(b => `${b.row_label}${b.seat_num}`).join(', ');
      return res.status(400).json({ error: `Seats ${taken} have already been reserved by another guest.` });
    }

    // 3. Compute Totals
    const seatsSubtotal = seats.reduce((sum, s) => sum + Number(s.price), 0);
    const concessionsSubtotal = concessions.reduce((sum, c) => sum + (Number(c.price) * Number(c.quantity)), 0);
    const subtotal = seatsSubtotal + concessionsSubtotal;
    const bookingFee = Number((seats.length * 1.75).toFixed(2));
    const finalDiscount = Number(discountAmount || 0);
    const totalAmount = Math.max(0, Number((subtotal + bookingFee - finalDiscount).toFixed(2)));

    // 4. Generate Reference & Scannable QR Code
    const bookingReference = generateReference();
    const seatListStr = seats.map(s => `${s.row_label}${s.seat_num}`).join(',');
    const qrPayload = JSON.stringify({
      ref: bookingReference,
      movie: showtime.movie_title,
      cinema: showtime.cinema_name,
      hall: showtime.hall_name,
      showtime: showtime.start_time,
      seats: seatListStr,
      guest: customerName,
      total: totalAmount
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
      margin: 2,
      width: 280,
      color: {
        dark: '#08090d',
        light: '#ffffff'
      }
    });

    // 5. Insert Booking
    const insertBooking = db.prepare(`
      INSERT INTO bookings (
        booking_reference, user_id, customer_name, customer_email, customer_phone,
        showtime_id, subtotal, booking_fee, discount_amount, total_amount,
        payment_method, payment_status, booking_status, qr_code_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PAID', 'CONFIRMED', ?)
    `);

    const bookingResult = insertBooking.run(
      bookingReference,
      userId ? Number(userId) : null,
      customerName,
      customerEmail,
      customerPhone,
      sId,
      subtotal,
      bookingFee,
      finalDiscount,
      totalAmount,
      paymentMethod,
      qrCodeDataUrl
    );

    const bookingId = bookingResult.lastInsertRowid;

    // 6. Insert Booking Items
    const insertItem = db.prepare(`
      INSERT INTO booking_items (booking_id, seat_id, row_label, seat_num, seat_tier, price)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const s of seats) {
      insertItem.run(bookingId, Number(s.id), s.row_label, Number(s.seat_num), s.seat_tier, Number(s.price));
    }

    // 7. Insert Booking Concessions
    if (concessions.length > 0) {
      const insertBookingConcession = db.prepare(`
        INSERT INTO booking_concessions (booking_id, concession_id, quantity, unit_price)
        VALUES (?, ?, ?, ?)
      `);
      for (const c of concessions) {
        if (c.quantity > 0) {
          insertBookingConcession.run(bookingId, Number(c.id), Number(c.quantity), Number(c.price));
        }
      }
    }

    // 8. Reward Points if registered
    if (userId) {
      const pointsEarned = Math.floor(totalAmount);
      db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(pointsEarned, Number(userId));
    }

    res.status(201).json({
      success: true,
      message: 'Booking confirmed successfully!',
      booking: {
        bookingId,
        bookingReference,
        totalAmount,
        subtotal,
        bookingFee,
        discountAmount: finalDiscount,
        qrCodeDataUrl,
        seats: seatListStr,
        movieTitle: showtime.movie_title,
        cinemaName: showtime.cinema_name,
        hallName: showtime.hall_name,
        startTime: showtime.start_time
      }
    });
  } catch (error) {
    console.error('Booking error:', error);
    res.status(400).json({ error: error.message || 'Failed to complete booking' });
  }
});

// Lookup Booking
router.get('/bookings/lookup', (req, res) => {
  try {
    const { reference, email } = req.query;

    if (!reference) {
      return res.status(400).json({ error: 'Booking reference is required' });
    }

    let query = `
      SELECT 
        b.*,
        s.start_time,
        s.end_time,
        s.format_type,
        m.id as movie_id,
        m.title as movie_title,
        m.poster_url,
        m.rating as movie_rating,
        m.duration_mins,
        h.name as hall_name,
        h.hall_type,
        c.name as cinema_name,
        c.address as cinema_address,
        c.city as cinema_city,
        c.phone as cinema_phone
      FROM bookings b
      JOIN showtimes s ON b.showtime_id = s.id
      JOIN movies m ON s.movie_id = m.id
      JOIN halls h ON s.hall_id = h.id
      JOIN cinemas c ON h.cinema_id = c.id
      WHERE b.booking_reference = ?
    `;

    const params = [reference.trim().toUpperCase()];

    if (email) {
      query += ' AND LOWER(b.customer_email) = LOWER(?)';
      params.push(email.trim());
    }

    const booking = db.prepare(query).get(...params);

    if (!booking) {
      return res.status(404).json({ error: 'No booking found with this reference and email.' });
    }

    const seats = db.prepare(`
      SELECT * FROM booking_items WHERE booking_id = ? ORDER BY row_label ASC, seat_num ASC
    `).all(booking.id);

    const concessions = db.prepare(`
      SELECT bc.*, c.name, c.image_url, c.category
      FROM booking_concessions bc
      JOIN concessions c ON bc.concession_id = c.id
      WHERE bc.booking_id = ?
    `).all(booking.id);

    res.json({
      ...booking,
      seats,
      concessions
    });
  } catch (error) {
    console.error('Error looking up booking:', error);
    res.status(500).json({ error: 'Failed to look up booking' });
  }
});

router.get('/bookings/user/:userId', (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const bookings = db.prepare(`
      SELECT 
        b.*,
        s.start_time,
        s.end_time,
        s.format_type,
        m.title as movie_title,
        m.poster_url,
        m.rating as movie_rating,
        m.duration_mins,
        h.name as hall_name,
        c.name as cinema_name,
        c.city as cinema_city
      FROM bookings b
      JOIN showtimes s ON b.showtime_id = s.id
      JOIN movies m ON s.movie_id = m.id
      JOIN halls h ON s.hall_id = h.id
      JOIN cinemas c ON h.cinema_id = c.id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `).all(userId);

    const enriched = bookings.map(b => {
      const seats = db.prepare('SELECT row_label, seat_num, seat_tier, price FROM booking_items WHERE booking_id = ?').all(b.id);
      return {
        ...b,
        seats
      };
    });

    res.json(enriched);
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ error: 'Failed to fetch user bookings' });
  }
});

// Cancellation & Seat Release
router.post('/bookings/:id/cancel', (req, res) => {
  try {
    const bookingId = Number(req.params.id);

    const booking = db.prepare(`
      SELECT b.*, s.start_time
      FROM bookings b
      JOIN showtimes s ON b.showtime_id = s.id
      WHERE b.id = ?
    `).get(bookingId);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    if (booking.booking_status === 'CANCELLED') {
      return res.status(400).json({ error: 'This booking has already been cancelled.' });
    }

    db.prepare(`
      UPDATE bookings 
      SET booking_status = 'CANCELLED', cancelled_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(bookingId);

    if (booking.user_id) {
      const pointsToDeduct = Math.floor(booking.total_amount);
      db.prepare('UPDATE users SET points = MAX(0, points - ?) WHERE id = ?').run(pointsToDeduct, booking.user_id);
    }

    res.json({
      success: true,
      message: `Booking ${booking.booking_reference} has been successfully cancelled. A full refund of $${booking.total_amount.toFixed(2)} will be returned to the original payment method.`,
      cancelledAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// -------------------------------------------------------------
// AUTH
// -------------------------------------------------------------
router.post('/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT id, email, full_name, phone, role, points, created_at FROM users WHERE LOWER(email) = LOWER(?) AND password = ?').get(email, password);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

router.post('/auth/register', (req, res) => {
  try {
    const { email, password, fullName, phone } = req.body;
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const result = db.prepare(`
      INSERT INTO users (email, password, full_name, phone, role, points)
      VALUES (?, ?, ?, ?, 'customer', 50)
    `).run(email, password, fullName, phone || '');

    const user = db.prepare('SELECT id, email, full_name, phone, role, points, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Failed to register account' });
  }
});

// -------------------------------------------------------------
// ADMIN ANALYTICS & QR VERIFIER
// -------------------------------------------------------------
router.get('/admin/stats', (req, res) => {
  try {
    const revenueRow = db.prepare(`
      SELECT 
        SUM(total_amount) as totalRevenue,
        COUNT(id) as totalBookings
      FROM bookings 
      WHERE booking_status = 'CONFIRMED'
    `).get();

    const seatsSoldRow = db.prepare(`
      SELECT COUNT(bi.id) as totalSeatsSold
      FROM booking_items bi
      JOIN bookings b ON bi.booking_id = b.id
      WHERE b.booking_status = 'CONFIRMED'
    `).get();

    const totalHallCapacityRow = db.prepare(`
      SELECT SUM(total_rows * total_cols) as totalCapacity FROM halls
    `).get();

    const totalActiveShowtimes = db.prepare(`
      SELECT COUNT(id) as count FROM showtimes WHERE datetime(start_time) >= datetime('now', '-1 day')
    `).get().count;

    const totalAvailableSlots = (totalHallCapacityRow.totalCapacity || 100) * (totalActiveShowtimes || 1);
    const occupancyRate = totalAvailableSlots > 0 ? ((seatsSoldRow.totalSeatsSold / totalAvailableSlots) * 100).toFixed(1) : '38.5';

    const topMovies = db.prepare(`
      SELECT 
        m.id,
        m.title,
        m.poster_url,
        m.genre,
        COUNT(DISTINCT b.id) as booking_count,
        SUM(b.total_amount) as revenue
      FROM movies m
      JOIN showtimes s ON m.id = s.movie_id
      JOIN bookings b ON s.id = b.showtime_id
      WHERE b.booking_status = 'CONFIRMED'
      GROUP BY m.id
      ORDER BY revenue DESC
      LIMIT 5
    `).all();

    const recentBookings = db.prepare(`
      SELECT 
        b.id,
        b.booking_reference,
        b.customer_name,
        b.customer_email,
        b.total_amount,
        b.booking_status,
        b.created_at,
        m.title as movie_title,
        c.name as cinema_name,
        s.start_time
      FROM bookings b
      JOIN showtimes s ON b.showtime_id = s.id
      JOIN movies m ON s.movie_id = m.id
      JOIN halls h ON s.hall_id = h.id
      JOIN cinemas c ON h.cinema_id = c.id
      ORDER BY b.created_at DESC
      LIMIT 10
    `).all();

    res.json({
      totalRevenue: revenueRow.totalRevenue || 0,
      totalBookings: revenueRow.totalBookings || 0,
      totalSeatsSold: seatsSoldRow.totalSeatsSold || 0,
      occupancyRate: `${occupancyRate}%`,
      topMovies,
      recentBookings
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

router.post('/admin/movies', (req, res) => {
  try {
    const {
      title, original_title, synopsis, poster_url, backdrop_url, trailer_url,
      genre, language, duration_mins, release_date, rating, imdb_score,
      cast_list, director, is_active = 1, is_trending = 0, is_coming_soon = 0
    } = req.body;

    if (!title || !synopsis || !poster_url || !genre) {
      return res.status(400).json({ error: 'Title, synopsis, poster URL, and genre are required' });
    }

    const result = db.prepare(`
      INSERT INTO movies (
        title, original_title, synopsis, poster_url, backdrop_url, trailer_url,
        genre, language, duration_mins, release_date, rating, imdb_score,
        cast_list, director, is_active, is_trending, is_coming_soon
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title, original_title || title, synopsis, poster_url,
      backdrop_url || poster_url, trailer_url || '',
      genre, language || 'English', Number(duration_mins || 120),
      release_date || new Date().toISOString().split('T')[0],
      rating || 'PG-13', Number(imdb_score || 8.0),
      cast_list || '', director || '', is_active ? 1 : 0,
      is_trending ? 1 : 0, is_coming_soon ? 1 : 0
    );

    const newMovie = db.prepare('SELECT * FROM movies WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, movie: newMovie });
  } catch (error) {
    console.error('Add movie error:', error);
    res.status(500).json({ error: 'Failed to add movie' });
  }
});

router.delete('/admin/movies/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM movies WHERE id = ?').run(Number(req.params.id));
    res.json({ success: true, message: 'Movie deleted successfully' });
  } catch (error) {
    console.error('Delete movie error:', error);
    res.status(500).json({ error: 'Failed to delete movie' });
  }
});

router.post('/admin/showtimes', (req, res) => {
  try {
    const { movie_id, hall_id, start_time, end_time, format_type, base_price, vip_price } = req.body;

    if (!movie_id || !hall_id || !start_time || !base_price) {
      return res.status(400).json({ error: 'Movie, Hall, Start Time, and Base Price are required' });
    }

    const result = db.prepare(`
      INSERT INTO showtimes (movie_id, hall_id, start_time, end_time, format_type, base_price, vip_price)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      Number(movie_id),
      Number(hall_id),
      start_time,
      end_time || start_time,
      format_type || 'Standard 2D',
      Number(base_price),
      Number(vip_price || (base_price * 1.4))
    );

    res.status(201).json({ success: true, showtimeId: result.lastInsertRowid });
  } catch (error) {
    console.error('Add showtime error:', error);
    res.status(500).json({ error: 'Failed to add showtime' });
  }
});

router.delete('/admin/showtimes/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM showtimes WHERE id = ?').run(Number(req.params.id));
    res.json({ success: true, message: 'Showtime deleted successfully' });
  } catch (error) {
    console.error('Delete showtime error:', error);
    res.status(500).json({ error: 'Failed to delete showtime' });
  }
});

router.post('/admin/verify-ticket', (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Ticket code or reference is required' });
    }

    let ref = code.trim().toUpperCase();
    if (code.includes('REF:')) {
      const match = code.match(/REF:([A-Z0-9-]+)/);
      if (match) ref = match[1];
    } else if (code.startsWith('{')) {
      try {
        const parsed = JSON.parse(code);
        if (parsed.ref) ref = parsed.ref;
      } catch (e) {}
    }

    const booking = db.prepare(`
      SELECT 
        b.*,
        s.start_time,
        s.format_type,
        m.title as movie_title,
        m.poster_url,
        h.name as hall_name,
        c.name as cinema_name
      FROM bookings b
      JOIN showtimes s ON b.showtime_id = s.id
      JOIN movies m ON s.movie_id = m.id
      JOIN halls h ON s.hall_id = h.id
      JOIN cinemas c ON h.cinema_id = c.id
      WHERE b.booking_reference = ?
    `).get(ref);

    if (!booking) {
      return res.json({
        valid: false,
        message: `Invalid Ticket. No booking found for reference "${ref}".`
      });
    }

    const seats = db.prepare('SELECT row_label, seat_num, seat_tier FROM booking_items WHERE booking_id = ?').all(booking.id);
    const seatList = seats.map(s => `${s.row_label}${s.seat_num}`).join(', ');

    if (booking.booking_status === 'CANCELLED') {
      return res.json({
        valid: false,
        status: 'CANCELLED',
        message: `Ticket ${ref} was CANCELLED and refunded on ${booking.cancelled_at}. Entry Denied.`,
        booking,
        seats: seatList
      });
    }

    return res.json({
      valid: true,
      status: 'VALID',
      message: `Ticket Verified! Welcome ${booking.customer_name}.`,
      booking,
      seats: seatList
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Failed to verify ticket' });
  }
});

export default router;
