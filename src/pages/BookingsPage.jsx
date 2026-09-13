import React, { useState, useEffect } from 'react';
import { 
  Ticket, 
  Search, 
  Calendar, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  XCircle, 
  CheckCircle, 
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { api } from '../services/api';

export default function BookingsPage({ 
  currentUser, 
  onViewTicket, 
  navigate,
  showToast 
}) {
  const [activeTab, setActiveTab] = useState(currentUser ? 'my-bookings' : 'guest-lookup');
  const [userBookings, setUserBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  // Guest lookup fields
  const [lookupRef, setLookupRef] = useState('');
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupResult, setLookupResult] = useState(null);

  // Cancellation Modal state
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [cancellingLoading, setCancellingLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadUserBookings();
    }
  }, [currentUser]);

  async function loadUserBookings() {
    try {
      setLoading(true);
      const data = await api.getUserBookings(currentUser.id);
      setUserBookings(data);
    } catch (e) {
      console.error('Failed to load user bookings:', e);
    } finally {
      setLoading(false);
    }
  }

  const handleGuestLookup = async (e) => {
    e.preventDefault();
    if (!lookupRef) {
      if (showToast) showToast('Please enter your booking reference (e.g. CNV-882914)', 'warning');
      return;
    }

    try {
      setLoading(true);
      setLookupResult(null);
      const data = await api.lookupBooking(lookupRef, lookupEmail);
      setLookupResult(data);
    } catch (err) {
      console.error('Lookup failed:', err);
      if (showToast) showToast(err.message || 'No booking found with this reference.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingBooking) return;
    try {
      setCancellingLoading(true);
      const res = await api.cancelBooking(cancellingBooking.id);
      if (showToast) showToast(res.message, 'success');

      // Refresh list
      if (currentUser) {
        await loadUserBookings();
      }
      if (lookupResult && lookupResult.id === cancellingBooking.id) {
        setLookupResult({
          ...lookupResult,
          booking_status: 'CANCELLED',
          cancelled_at: res.cancelledAt
        });
      }

      setCancellingBooking(null);
    } catch (err) {
      console.error('Cancel failed:', err);
      if (showToast) showToast(err.message || 'Failed to cancel booking', 'error');
    } finally {
      setCancellingLoading(false);
    }
  };

  return (
    <div className="bookings-page container" style={{ padding: '3rem 1.5rem 6rem 1.5rem' }}>
      <div className="section-header">
        <div>
          <h1 className="section-title">My Bookings & Reservations</h1>
          <p className="section-subtitle">
            View active movie tickets, access digital QR passes, and manage cancellations
          </p>
        </div>

        {/* Tab Toggle */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {currentUser && (
            <button
              className={`genre-pill ${activeTab === 'my-bookings' ? 'active' : ''}`}
              onClick={() => setActiveTab('my-bookings')}
            >
              My Account Bookings ({userBookings.length})
            </button>
          )}
          <button
            className={`genre-pill ${activeTab === 'guest-lookup' ? 'active' : ''}`}
            onClick={() => setActiveTab('guest-lookup')}
          >
            Guest Lookup (Reference Code)
          </button>
        </div>
      </div>

      {/* 1. GUEST LOOKUP TAB */}
      {activeTab === 'guest-lookup' && (
        <div style={{ maxWidth: '650px', margin: '0 auto' }}>
          <div className="glass-card" style={{ padding: '2.5rem', marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '0.5rem' }}>
              Find Your Booking
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Enter your unique 6-character booking reference code sent in your confirmation email
            </p>

            <form onSubmit={handleGuestLookup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="filter-group">
                <span className="filter-label">Booking Reference</span>
                <div className="filter-input-wrap">
                  <Ticket size={16} color="var(--gold-primary)" />
                  <input
                    type="text"
                    placeholder="e.g. CNV-882914"
                    className="filter-input"
                    value={lookupRef}
                    onChange={(e) => setLookupRef(e.target.value.toUpperCase())}
                    required
                  />
                </div>
              </div>

              <div className="filter-group">
                <span className="filter-label">Email Address (Optional)</span>
                <div className="filter-input-wrap">
                  <Search size={16} color="var(--text-muted)" />
                  <input
                    type="email"
                    placeholder="Email used during checkout"
                    className="filter-input"
                    value={lookupEmail}
                    onChange={(e) => setLookupEmail(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
                <Search size={16} />
                {loading ? 'Searching...' : 'Retrieve Ticket'}
              </button>
            </form>
          </div>

          {/* Lookup Result Card */}
          {lookupResult && (
            <div className="glass-card" style={{ padding: '2rem', border: '1px solid var(--border-focus)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <span className={`badge ${lookupResult.booking_status === 'CANCELLED' ? 'badge-ruby' : 'badge-gold'}`} style={{ marginBottom: '0.4rem' }}>
                    {lookupResult.booking_status}
                  </span>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: '800' }}>{lookupResult.movie_title}</h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Ref: <strong>{lookupResult.booking_reference}</strong> • {lookupResult.cinema_name}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: '900', color: 'var(--gold-light)' }}>
                    ${lookupResult.total_amount.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {(lookupResult.seats || []).length} Seat(s)
                  </div>
                </div>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.03)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
                marginBottom: '1.5rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Showtime:</div>
                  <div style={{ fontWeight: '700', color: '#fff' }}>{lookupResult.start_time}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hall:</div>
                  <div style={{ fontWeight: '700', color: '#fff' }}>{lookupResult.hall_name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Seats:</div>
                  <div style={{ fontWeight: '700', color: 'var(--cyan-neon)' }}>
                    {(lookupResult.seats || []).map(s => `${s.row_label}${s.seat_num}`).join(', ')}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => onViewTicket(lookupResult.booking_reference, lookupResult.customer_email)}
                >
                  <Ticket size={15} /> View Full Digital Ticket Pass
                </button>

                {lookupResult.booking_status === 'CONFIRMED' && (
                  <button 
                    className="btn btn-ruby btn-sm"
                    onClick={() => setCancellingBooking(lookupResult)}
                  >
                    <XCircle size={15} /> Cancel Booking & Refund
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. LOGGED IN USER BOOKINGS TAB */}
      {activeTab === 'my-bookings' && (
        <div>
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading your booking history...
            </div>
          ) : userBookings.length === 0 ? (
            <div className="glass-card" style={{ padding: '4rem', textAlign: 'center' }}>
              <Ticket size={40} color="var(--gold-primary)" style={{ opacity: 0.8, marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>No Bookings Yet</h3>
              <p style={{ maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
                You haven't reserved any cinema tickets yet. Explore current movies and choose your seats!
              </p>
              <button className="btn btn-primary" onClick={() => navigate('home')}>
                Browse Now Showing Movies
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {userBookings.map(b => {
                const isConfirmed = b.booking_status === 'CONFIRMED';
                return (
                  <div key={b.id} className="glass-card" style={{ padding: '1.75rem' }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                      gap: '1.5rem',
                      alignItems: 'center'
                    }}>
                      {/* Movie Thumbnail + Title */}
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <img 
                          src={b.poster_url} 
                          alt={b.movie_title}
                          style={{ width: '56px', height: '82px', objectFit: 'cover', borderRadius: 'var(--radius-md)' }}
                        />
                        <div>
                          <span className={`badge ${isConfirmed ? 'badge-green' : 'badge-ruby'}`} style={{ marginBottom: '0.35rem', fontSize: '0.65rem' }}>
                            {b.booking_status}
                          </span>
                          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#fff' }}>
                            {b.movie_title}
                          </h3>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Ref: <strong style={{ color: 'var(--gold-light)' }}>{b.booking_reference}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Location & Time */}
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fff' }}>
                          <MapPin size={15} color="var(--gold-primary)" />
                          <span>{b.cinema_name} ({b.hall_name})</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Calendar size={15} color="var(--cyan-neon)" />
                          <span>{b.start_time}</span>
                        </div>
                        <div style={{ color: 'var(--cyan-neon)', fontWeight: '600' }}>
                          Seats: {(b.seats || []).map(s => `${s.row_label}${s.seat_num}`).join(', ')}
                        </div>
                      </div>

                      {/* Total & Action Buttons */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: '900', color: 'var(--gold-light)' }}>
                          ${b.total_amount.toFixed(2)}
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => onViewTicket(b.booking_reference, b.customer_email)}
                          >
                            <Ticket size={14} /> View Ticket Pass
                          </button>

                          {isConfirmed && (
                            <button
                              className="btn btn-ruby btn-sm"
                              onClick={() => setCancellingBooking(b)}
                              title="Cancel reservation and request full refund"
                            >
                              <XCircle size={14} /> Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {cancellingBooking && (
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
          <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '2rem', border: '1px solid var(--ruby-red)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--ruby-red)', marginBottom: '1rem' }}>
              <AlertTriangle size={28} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Cancel Reservation?</h3>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              Are you sure you want to cancel booking <strong>{cancellingBooking.booking_reference}</strong> for <strong>{cancellingBooking.movie_title}</strong>?
            </p>

            <div style={{ background: 'rgba(244, 63, 94, 0.08)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              <div>• Reserved seats will be <strong>immediately released</strong> back to the theater.</div>
              <div>• A full refund of <strong>${cancellingBooking.total_amount.toFixed(2)}</strong> will be credited to your original payment method.</div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-outline" 
                onClick={() => setCancellingBooking(null)}
                disabled={cancellingLoading}
              >
                Keep Booking
              </button>
              <button 
                className="btn btn-ruby" 
                onClick={handleConfirmCancel}
                disabled={cancellingLoading}
              >
                {cancellingLoading ? 'Processing Cancellation...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
