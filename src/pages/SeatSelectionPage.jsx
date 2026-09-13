import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Clock, 
  MapPin, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Ticket,
  Crown,
  Accessibility,
  Armchair
} from 'lucide-react';
import { api } from '../services/api';

export default function SeatSelectionPage({ 
  showtimeId, 
  onBack, 
  onProceedToCheckout,
  showToast 
}) {
  const [showtime, setShowtime] = useState(null);
  const [seatData, setSeatData] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);

  const MAX_SEATS = 8;

  useEffect(() => {
    loadSeatMap();
  }, [showtimeId]);

  async function loadSeatMap() {
    try {
      setLoading(true);
      const [stInfo, sMap] = await Promise.all([
        api.getShowtime(showtimeId),
        api.getShowtimeSeats(showtimeId)
      ]);
      setShowtime(stInfo);
      setSeatData(sMap);
      setSelectedSeats([]); // reset on load
    } catch (err) {
      console.error('Failed to load seat map:', err);
      if (showToast) showToast('Failed to load seat map', 'error');
    } finally {
      setLoading(false);
    }
  }

  const toggleSeat = (seat) => {
    if (seat.isBooked) return;

    const isAlreadySelected = selectedSeats.some(s => s.id === seat.id);

    if (isAlreadySelected) {
      setSelectedSeats(selectedSeats.filter(s => s.id !== seat.id));
    } else {
      if (selectedSeats.length >= MAX_SEATS) {
        if (showToast) showToast(`You can select a maximum of ${MAX_SEATS} seats per transaction.`, 'warning');
        return;
      }
      setSelectedSeats([...selectedSeats, seat]);
    }
  };

  const totalPrice = selectedSeats.reduce((sum, s) => sum + s.price, 0);

  if (loading) {
    return (
      <div className="container" style={{ padding: '6rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading auditorium seat map & availability...
      </div>
    );
  }

  if (!showtime || !seatData) {
    return (
      <div className="container" style={{ padding: '6rem 0', textAlign: 'center' }}>
        <h2>Showtime not found</h2>
        <button className="btn btn-outline" onClick={onBack} style={{ marginTop: '1rem' }}>
          <ArrowLeft size={16} /> Back
        </button>
      </div>
    );
  }

  const timeOnly = showtime.start_time.split(' ')[1] || showtime.start_time;
  const dateOnly = showtime.start_time.split(' ')[0];

  return (
    <div className="seat-selection-page" style={{ paddingBottom: '140px' }}>
      {/* Top Header Bar */}
      <div style={{
        background: 'rgba(14, 17, 26, 0.95)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '1.25rem 0'
      }}>
        <div className="container" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <button className="btn btn-outline btn-sm" onClick={onBack}>
            <ArrowLeft size={15} /> Change Showtime
          </button>

          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#fff' }}>
              {showtime.movie_title}
            </h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
              <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>{showtime.format_type}</span>
              <span>{showtime.cinema_name} • {showtime.hall_name}</span>
              <span>•</span>
              <span style={{ color: 'var(--gold-light)', fontWeight: '600' }}>{dateOnly} {timeOnly}</span>
            </div>
          </div>

          <div className="badge badge-cyan" style={{ padding: '0.45rem 0.85rem' }}>
            <span>{seatData.availableSeats} Seats Available</span>
          </div>
        </div>
      </div>

      <div className="container seat-map-view">
        {/* Curved Cinema Screen */}
        <div className="cinema-screen-container">
          <div className="cinema-screen-curve" />
          <div className="screen-light-glow" />
          <div className="screen-text">ALL EYES ON CURVED LASER SCREEN</div>
        </div>

        {/* Seat Legend */}
        <div className="seat-legend">
          <div className="legend-item">
            <span className="seat-preview-box seat-preview-available" />
            <span>Standard (${seatData.basePrice.toFixed(2)})</span>
          </div>
          <div className="legend-item">
            <span className="seat-preview-box seat-preview-vip" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Crown size={10} color="#c4b5fd" />
            </span>
            <span>VIP Recliner (${seatData.vipPrice.toFixed(2)})</span>
          </div>
          <div className="legend-item">
            <span className="seat-preview-box" style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.5)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Accessibility size={10} color="#6ee7b7" />
            </span>
            <span>Accessible</span>
          </div>
          <div className="legend-item">
            <span className="seat-preview-box seat-preview-selected" />
            <span style={{ color: 'var(--cyan-neon)', fontWeight: '700' }}>Selected</span>
          </div>
          <div className="legend-item">
            <span className="seat-preview-box seat-preview-booked" />
            <span>Booked / Reserved</span>
          </div>
        </div>

        {/* Interactive Theater Grid */}
        <div className="seat-grid-table">
          {Object.entries(seatData.rows).map(([rowLabel, seatsInRow]) => (
            <div key={rowLabel} className="seat-row">
              <span className="seat-row-label">{rowLabel}</span>

              {seatsInRow.map(seat => {
                const isSelected = selectedSeats.some(s => s.id === seat.id);
                let seatClass = `seat-button ${seat.seat_tier}`;
                if (seat.isBooked) seatClass += ' booked';
                if (isSelected) seatClass += ' selected';

                return (
                  <button
                    key={seat.id}
                    className={seatClass}
                    onClick={() => toggleSeat(seat)}
                    disabled={seat.isBooked}
                    title={seat.isBooked 
                      ? `Seat ${rowLabel}${seat.seat_num} is already booked` 
                      : `Seat ${rowLabel}${seat.seat_num} (${seat.seat_tier.toUpperCase()}) - $${seat.price.toFixed(2)}`}
                  >
                    {isSelected ? (
                      <Check size={14} strokeWidth={3} />
                    ) : seat.seat_tier === 'vip' ? (
                      <Crown size={12} />
                    ) : seat.seat_tier === 'accessible' ? (
                      <Accessibility size={12} />
                    ) : (
                      seat.seat_num
                    )}
                  </button>
                );
              })}

              <span className="seat-row-label">{rowLabel}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Bottom Sticky Bar */}
      <div className="seat-summary-floating">
        <div className="container seat-summary-inner">
          {/* Selected Seats Badges */}
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '0.35rem' }}>
              Selected Seats ({selectedSeats.length} / {MAX_SEATS})
            </div>
            {selectedSeats.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Click on available seats on the map above to select
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {selectedSeats.map(s => (
                  <span key={s.id} className="badge badge-cyan" style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}>
                    Row {s.row_label}-{s.seat_num} ({s.seat_tier.toUpperCase()})
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Pricing & Checkout Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Subtotal</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--gold-light)' }}>
                ${totalPrice.toFixed(2)}
              </div>
            </div>

            <button
              className="btn btn-primary btn-lg"
              disabled={selectedSeats.length === 0}
              onClick={() => onProceedToCheckout({
                showtime,
                seats: selectedSeats,
                subtotal: totalPrice
              })}
            >
              <Ticket size={18} />
              Proceed to Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
