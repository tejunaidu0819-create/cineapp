const API_BASE = '/api';

export const api = {
  // Movies
  async getMovies(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '' && val !== 'All') {
        query.append(key, val);
      }
    });
    const res = await fetch(`${API_BASE}/movies?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to load movies');
    return res.json();
  },

  async getMovie(id) {
    const res = await fetch(`${API_BASE}/movies/${id}`);
    if (!res.ok) throw new Error('Movie not found');
    return res.json();
  },

  // Cinemas
  async getCinemas() {
    const res = await fetch(`${API_BASE}/cinemas`);
    if (!res.ok) throw new Error('Failed to load cinemas');
    return res.json();
  },

  async getCinema(id) {
    const res = await fetch(`${API_BASE}/cinemas/${id}`);
    if (!res.ok) throw new Error('Cinema not found');
    return res.json();
  },

  // Showtimes
  async getShowtimes(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '' && val !== 'All') {
        query.append(key, val);
      }
    });
    const res = await fetch(`${API_BASE}/showtimes?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to load showtimes');
    return res.json();
  },

  async getShowtime(id) {
    const res = await fetch(`${API_BASE}/showtimes/${id}`);
    if (!res.ok) throw new Error('Showtime not found');
    return res.json();
  },

  async getShowtimeSeats(showtimeId) {
    const res = await fetch(`${API_BASE}/showtimes/${showtimeId}/seats`);
    if (!res.ok) throw new Error('Failed to load seats layout');
    return res.json();
  },

  // Concessions
  async getConcessions() {
    const res = await fetch(`${API_BASE}/concessions`);
    if (!res.ok) throw new Error('Failed to load concessions');
    return res.json();
  },

  // Bookings
  async createBooking(bookingData) {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to complete booking');
    return data;
  },

  async lookupBooking(reference, email) {
    const query = new URLSearchParams({ reference });
    if (email) query.append('email', email);
    const res = await fetch(`${API_BASE}/bookings/lookup?${query.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Booking not found');
    return data;
  },

  async getUserBookings(userId) {
    const res = await fetch(`${API_BASE}/bookings/user/${userId}`);
    if (!res.ok) throw new Error('Failed to load bookings');
    return res.json();
  },

  async cancelBooking(bookingId) {
    const res = await fetch(`${API_BASE}/bookings/${bookingId}/cancel`, {
      method: 'POST'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to cancel booking');
    return data;
  },

  // Auth
  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Invalid credentials');
    return data;
  },

  async register(userData) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to register');
    return data;
  },

  async getUser(id) {
    const res = await fetch(`${API_BASE}/auth/user/${id}`);
    if (!res.ok) throw new Error('Failed to load user profile');
    return res.json();
  },

  // Admin
  async getAdminStats() {
    const res = await fetch(`${API_BASE}/admin/stats`);
    if (!res.ok) throw new Error('Failed to load admin stats');
    return res.json();
  },

  async addMovie(movieData) {
    const res = await fetch(`${API_BASE}/admin/movies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(movieData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add movie');
    return data;
  },

  async deleteMovie(id) {
    const res = await fetch(`${API_BASE}/admin/movies/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete movie');
    return data;
  },

  async addShowtime(showtimeData) {
    const res = await fetch(`${API_BASE}/admin/showtimes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(showtimeData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add showtime');
    return data;
  },

  async deleteShowtime(id) {
    const res = await fetch(`${API_BASE}/admin/showtimes/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete showtime');
    return data;
  },

  async verifyTicket(code) {
    const res = await fetch(`${API_BASE}/admin/verify-ticket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to verify ticket');
    return data;
  }
};
