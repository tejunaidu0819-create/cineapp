import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  TrendingUp, 
  DollarSign, 
  Ticket, 
  Film, 
  Users, 
  Calendar, 
  Plus, 
  Trash2, 
  QrCode, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';

export default function AdminPage({ currentUser, navigate, showToast }) {
  const [stats, setStats] = useState(null);
  const [movies, setMovies] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tab
  const [activeTab, setActiveTab] = useState('metrics'); // 'metrics', 'movies', 'showtimes', 'scanner'

  // Add Movie Form
  const [movieModalOpen, setMovieModalOpen] = useState(false);
  const [newMovie, setNewMovie] = useState({
    title: '',
    synopsis: '',
    poster_url: '',
    backdrop_url: '',
    trailer_url: '',
    genre: 'Action, Sci-Fi',
    language: 'English',
    duration_mins: 135,
    release_date: new Date().toISOString().split('T')[0],
    rating: 'PG-13',
    imdb_score: 8.5,
    director: '',
    cast_list: '',
    is_trending: 1,
    is_coming_soon: 0
  });

  // Add Showtime Form
  const [showtimeModalOpen, setShowtimeModalOpen] = useState(false);
  const [newShowtime, setNewShowtime] = useState({
    movie_id: '',
    hall_id: '1',
    start_time: `${new Date().toISOString().split('T')[0]} 20:00`,
    format_type: 'IMAX 3D Laser',
    base_price: 21.00,
    vip_price: 29.50
  });

  // Scanner State
  const [scannerCode, setScannerCode] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, []);

  async function loadAdminData() {
    try {
      setLoading(true);
      const [statsData, moviesData, cinemasData] = await Promise.all([
        api.getAdminStats(),
        api.getMovies(),
        api.getCinemas()
      ]);
      setStats(statsData);
      setMovies(moviesData);
      setCinemas(cinemasData);

      if (moviesData.length > 0 && !newShowtime.movie_id) {
        setNewShowtime(prev => ({ ...prev, movie_id: moviesData[0].id }));
      }
    } catch (e) {
      console.error('Failed to load admin data:', e);
      if (showToast) showToast('Failed to load admin statistics', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleAddMovie = async (e) => {
    e.preventDefault();
    try {
      await api.addMovie(newMovie);
      if (showToast) showToast(`Movie "${newMovie.title}" added to database!`, 'success');
      setMovieModalOpen(false);
      await loadAdminData();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to add movie', 'error');
    }
  };

  const handleDeleteMovie = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete movie "${title}" and all its showtimes?`)) return;
    try {
      await api.deleteMovie(id);
      if (showToast) showToast(`Movie "${title}" removed from catalog.`, 'info');
      await loadAdminData();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to delete movie', 'error');
    }
  };

  const handleAddShowtime = async (e) => {
    e.preventDefault();
    try {
      await api.addShowtime(newShowtime);
      if (showToast) showToast('New showtime scheduled successfully!', 'success');
      setShowtimeModalOpen(false);
      await loadAdminData();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to schedule showtime', 'error');
    }
  };

  const handleVerifyTicket = async (e) => {
    e.preventDefault();
    if (!scannerCode) return;
    try {
      setScanning(true);
      const res = await api.verifyTicket(scannerCode);
      setScanResult(res);
    } catch (err) {
      setScanResult({ valid: false, message: err.message || 'Verification failed.' });
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="admin-page container" style={{ padding: '3rem 1.5rem 6rem 1.5rem' }}>
      {/* Header */}
      <div className="section-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--cyan-neon)', marginBottom: '0.25rem' }}>
            <ShieldCheck size={20} />
            <span style={{ fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Management Portal
            </span>
          </div>
          <h1 className="section-title">Cinema Operations & Analytics</h1>
        </div>

        {/* Tab Selector */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'metrics', label: 'KPI Analytics' },
            { id: 'movies', label: 'Movie Catalog' },
            { id: 'showtimes', label: 'Scheduler' },
            { id: 'scanner', label: 'QR Usher Scanner' }
          ].map(tab => (
            <button
              key={tab.id}
              className={`genre-pill ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading real-time cinema metrics...
        </div>
      ) : (
        <>
          {/* TAB 1: METRICS & REVENUE OVERVIEW */}
          {activeTab === 'metrics' && (
            <div>
              {/* KPI Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2.5rem'
              }}>
                <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--gold-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Gross Revenue</span>
                    <DollarSign size={20} color="var(--gold-primary)" />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '900', color: '#fff' }}>
                    ${(stats?.totalRevenue || 0).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--emerald-green)', marginTop: '0.35rem' }}>
                    Live SQLite Database Aggregation
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--cyan-neon)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Total Bookings</span>
                    <Ticket size={20} color="var(--cyan-neon)" />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '900', color: '#fff' }}>
                    {stats?.totalBookings || 0}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--cyan-neon)', marginTop: '0.35rem' }}>
                    Confirmed Transactions
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--purple-vip)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Seats Reserved</span>
                    <Users size={20} color="var(--purple-vip)" />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '900', color: '#fff' }}>
                    {stats?.totalSeatsSold || 0}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                    Active Seat Locks
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--emerald-green)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Theater Occupancy</span>
                    <TrendingUp size={20} color="var(--emerald-green)" />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--emerald-green)' }}>
                    {stats?.occupancyRate || '38.5%'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                    Across all halls & slots
                  </div>
                </div>
              </div>

              {/* Recent Bookings & Top Grossing Movies */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                gap: '2rem'
              }}>
                {/* Recent Bookings Table */}
                <div className="glass-card" style={{ padding: '2rem' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1.25rem' }}>
                    Recent Customer Transactions
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {(stats?.recentBookings || []).map(rb => (
                      <div
                        key={rb.id}
                        style={{
                          padding: '0.85rem',
                          borderRadius: 'var(--radius-md)',
                          background: 'rgba(255,255,255,0.03)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.85rem'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '700', color: '#fff' }}>{rb.customer_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {rb.movie_title} • Ref: {rb.booking_reference}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: '800', color: 'var(--gold-light)' }}>
                            ${rb.total_amount.toFixed(2)}
                          </div>
                          <span className={`badge ${rb.booking_status === 'CONFIRMED' ? 'badge-green' : 'badge-ruby'}`} style={{ fontSize: '0.65rem' }}>
                            {rb.booking_status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Movies */}
                <div className="glass-card" style={{ padding: '2rem' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1.25rem' }}>
                    Top Grossing Box Office
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {(stats?.topMovies || []).map((tm, idx) => (
                      <div
                        key={tm.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          padding: '0.75rem',
                          borderRadius: 'var(--radius-md)',
                          background: 'rgba(255,255,255,0.02)'
                        }}
                      >
                        <span style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--gold-primary)', width: '20px' }}>
                          #{idx + 1}
                        </span>
                        <img 
                          src={tm.poster_url} 
                          alt={tm.title}
                          style={{ width: '40px', height: '58px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '700', color: '#fff', fontSize: '0.9rem' }}>{tm.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {tm.booking_count} Bookings
                          </div>
                        </div>
                        <div style={{ fontWeight: '800', color: 'var(--gold-light)' }}>
                          ${(tm.revenue || 0).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MOVIES MANAGEMENT */}
          {activeTab === 'movies' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: '800' }}>Active Theater Catalog ({movies.length})</h2>
                <button className="btn btn-primary btn-sm" onClick={() => setMovieModalOpen(true)}>
                  <Plus size={16} /> Add New Movie
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {movies.map(m => (
                  <div key={m.id} className="glass-card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem' }}>
                    <img 
                      src={m.poster_url} 
                      alt={m.title}
                      style={{ width: '70px', height: '100px', objectFit: 'cover', borderRadius: 'var(--radius-md)' }}
                    />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#fff' }}>{m.title}</h4>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{m.genre}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {m.duration_mins} mins • {m.rating} • {m.language}
                      </div>

                      <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem', paddingTop: '0.5rem' }}>
                        <button 
                          className="btn btn-ruby btn-sm"
                          onClick={() => handleDeleteMovie(m.id, m.title)}
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SHOWTIME SCHEDULER */}
          {activeTab === 'showtimes' && (
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div className="glass-card" style={{ padding: '2.5rem' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '1rem' }}>
                  Schedule New Movie Showtime
                </h2>

                <form onSubmit={handleAddShowtime} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="filter-group">
                    <span className="filter-label">Select Movie</span>
                    <div className="filter-input-wrap">
                      <select 
                        className="filter-select"
                        value={newShowtime.movie_id}
                        onChange={(e) => setNewShowtime({ ...newShowtime, movie_id: e.target.value })}
                        required
                      >
                        {movies.map(m => (
                          <option key={m.id} value={m.id}>{m.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="filter-group">
                    <span className="filter-label">Auditorium & Hall</span>
                    <div className="filter-input-wrap">
                      <select 
                        className="filter-select"
                        value={newShowtime.hall_id}
                        onChange={(e) => setNewShowtime({ ...newShowtime, hall_id: e.target.value })}
                        required
                      >
                        <option value="1">Auditorium 1 - IMAX Grand Laser (New York)</option>
                        <option value="2">Auditorium 2 - Dolby Atmos Prime (New York)</option>
                        <option value="3">Auditorium 3 - VIP Luxe Suite (New York)</option>
                        <option value="4">Screen 1 - Dolby Cinema Supreme (Los Angeles)</option>
                        <option value="5">Screen 2 - Laser Standard 4K (Los Angeles)</option>
                        <option value="6">Lounge Hall A - VIP Pods (San Francisco)</option>
                        <option value="7">Lounge Hall B - Atmos Classic (San Francisco)</option>
                        <option value="8">Hall 4DX - Extreme Motion (Chicago)</option>
                      </select>
                    </div>
                  </div>

                  <div className="filter-group">
                    <span className="filter-label">Start Date & Time (YYYY-MM-DD HH:mm)</span>
                    <div className="filter-input-wrap">
                      <input 
                        type="text" 
                        className="filter-input"
                        value={newShowtime.start_time}
                        onChange={(e) => setNewShowtime({ ...newShowtime, start_time: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="filter-group">
                    <span className="filter-label">Format Type</span>
                    <div className="filter-input-wrap">
                      <select 
                        className="filter-select"
                        value={newShowtime.format_type}
                        onChange={(e) => setNewShowtime({ ...newShowtime, format_type: e.target.value })}
                      >
                        <option value="IMAX 3D Laser">IMAX 3D Laser</option>
                        <option value="Dolby Atmos Prime">Dolby Atmos Prime</option>
                        <option value="VIP Luxe Suite">VIP Luxe Suite</option>
                        <option value="4DX Motion">4DX Motion</option>
                        <option value="Standard 2D Laser">Standard 2D Laser</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="filter-group">
                      <span className="filter-label">Standard Seat Price ($)</span>
                      <div className="filter-input-wrap">
                        <input 
                          type="number" 
                          step="0.5" 
                          className="filter-input"
                          value={newShowtime.base_price}
                          onChange={(e) => setNewShowtime({ ...newShowtime, base_price: Number(e.target.value) })}
                          required
                        />
                      </div>
                    </div>

                    <div className="filter-group">
                      <span className="filter-label">VIP Recliner Price ($)</span>
                      <div className="filter-input-wrap">
                        <input 
                          type="number" 
                          step="0.5" 
                          className="filter-input"
                          value={newShowtime.vip_price}
                          onChange={(e) => setNewShowtime({ ...newShowtime, vip_price: Number(e.target.value) })}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary btn-lg" style={{ marginTop: '0.5rem' }}>
                    <Plus size={18} /> Schedule Showtime
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 4: USHER QR CODE SCANNER */}
          {activeTab === 'scanner' && (
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div className="glass-card" style={{ padding: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                  <QrCode size={24} color="var(--gold-primary)" />
                  <h2 style={{ fontSize: '1.3rem', fontWeight: '800' }}>Live Ticket QR Scanner & Check-In</h2>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  Simulate door usher scanner: scan/paste QR payload or enter 6-character reference code (e.g. <code>CNV-882914</code>)
                </p>

                <form onSubmit={handleVerifyTicket} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="filter-group">
                    <span className="filter-label">Ticket Code / QR Data</span>
                    <div className="filter-input-wrap">
                      <input 
                        type="text" 
                        placeholder="Scan or enter ref: CNV-XXXXXX"
                        className="filter-input"
                        value={scannerCode}
                        onChange={(e) => setScannerCode(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="submit" className="btn btn-primary" disabled={scanning} style={{ flex: 1 }}>
                      {scanning ? 'Verifying...' : 'Validate Ticket Entry'}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-outline btn-sm"
                      onClick={() => setScannerCode('CNV-882914')}
                    >
                      Sample Valid
                    </button>
                  </div>
                </form>

                {/* Scan Result */}
                {scanResult && (
                  <div style={{
                    marginTop: '2rem',
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-lg)',
                    background: scanResult.valid ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
                    border: `1px solid ${scanResult.valid ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                      {scanResult.valid ? (
                        <CheckCircle2 size={24} color="var(--emerald-green)" />
                      ) : (
                        <XCircle size={24} color="var(--ruby-red)" />
                      )}
                      <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: scanResult.valid ? 'var(--emerald-green)' : 'var(--ruby-red)' }}>
                        {scanResult.valid ? 'ACCESS GRANTED' : 'ENTRY DENIED'}
                      </h3>
                    </div>

                    <p style={{ fontSize: '0.9rem', color: '#fff', marginBottom: '0.75rem' }}>
                      {scanResult.message}
                    </p>

                    {scanResult.booking && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div>Guest: <strong>{scanResult.booking.customer_name}</strong></div>
                        <div>Movie: <strong>{scanResult.booking.movie_title}</strong></div>
                        <div>Hall: <strong>{scanResult.booking.hall_name}</strong></div>
                        <div>Seats: <strong style={{ color: 'var(--cyan-neon)' }}>{scanResult.seats}</strong></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Add Movie Modal */}
          {movieModalOpen && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
              zIndex: 10000
            }}>
              <div className="glass-card" style={{ maxWidth: '640px', width: '100%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '1.25rem' }}>
                  Add Movie to Catalog
                </h2>

                <form onSubmit={handleAddMovie} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="filter-group">
                    <span className="filter-label">Movie Title</span>
                    <div className="filter-input-wrap">
                      <input 
                        type="text" 
                        className="filter-input"
                        value={newMovie.title}
                        onChange={(e) => setNewMovie({ ...newMovie, title: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="filter-group">
                    <span className="filter-label">Synopsis</span>
                    <div className="filter-input-wrap">
                      <textarea 
                        className="filter-input"
                        rows={3}
                        value={newMovie.synopsis}
                        onChange={(e) => setNewMovie({ ...newMovie, synopsis: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="filter-group">
                      <span className="filter-label">Poster Image URL</span>
                      <div className="filter-input-wrap">
                        <input 
                          type="url" 
                          className="filter-input"
                          value={newMovie.poster_url}
                          onChange={(e) => setNewMovie({ ...newMovie, poster_url: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="filter-group">
                      <span className="filter-label">Backdrop Image URL</span>
                      <div className="filter-input-wrap">
                        <input 
                          type="url" 
                          className="filter-input"
                          value={newMovie.backdrop_url}
                          onChange={(e) => setNewMovie({ ...newMovie, backdrop_url: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="filter-group">
                      <span className="filter-label">Genre</span>
                      <div className="filter-input-wrap">
                        <input 
                          type="text" 
                          className="filter-input"
                          value={newMovie.genre}
                          onChange={(e) => setNewMovie({ ...newMovie, genre: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="filter-group">
                      <span className="filter-label">Language</span>
                      <div className="filter-input-wrap">
                        <input 
                          type="text" 
                          className="filter-input"
                          value={newMovie.language}
                          onChange={(e) => setNewMovie({ ...newMovie, language: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div className="filter-group">
                      <span className="filter-label">Duration (mins)</span>
                      <div className="filter-input-wrap">
                        <input 
                          type="number" 
                          className="filter-input"
                          value={newMovie.duration_mins}
                          onChange={(e) => setNewMovie({ ...newMovie, duration_mins: Number(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="filter-group">
                      <span className="filter-label">Age Rating</span>
                      <div className="filter-input-wrap">
                        <input 
                          type="text" 
                          className="filter-input"
                          value={newMovie.rating}
                          onChange={(e) => setNewMovie({ ...newMovie, rating: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="filter-group">
                      <span className="filter-label">IMDb Score</span>
                      <div className="filter-input-wrap">
                        <input 
                          type="number" 
                          step="0.1" 
                          className="filter-input"
                          value={newMovie.imdb_score}
                          onChange={(e) => setNewMovie({ ...newMovie, imdb_score: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="filter-group">
                    <span className="filter-label">Director</span>
                    <div className="filter-input-wrap">
                      <input 
                        type="text" 
                        className="filter-input"
                        value={newMovie.director}
                        onChange={(e) => setNewMovie({ ...newMovie, director: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="filter-group">
                    <span className="filter-label">Cast Members</span>
                    <div className="filter-input-wrap">
                      <input 
                        type="text" 
                        className="filter-input"
                        value={newMovie.cast_list}
                        onChange={(e) => setNewMovie({ ...newMovie, cast_list: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                    <button type="button" className="btn btn-outline" onClick={() => setMovieModalOpen(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Save & Publish Movie
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
