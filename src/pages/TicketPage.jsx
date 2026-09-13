import React, { useState, useEffect } from 'react';
import { 
  Ticket, 
  Printer, 
  Download, 
  Calendar, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  ArrowLeft,
  Share2,
  Film
} from 'lucide-react';
import { api } from '../services/api';

export default function TicketPage({ 
  bookingReference, 
  userEmail, 
  onBackToHome, 
  onViewBookings,
  showToast 
}) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (bookingReference) {
      loadTicket();
    }
  }, [bookingReference, userEmail]);

  async function loadTicket() {
    try {
      setLoading(true);
      const data = await api.lookupBooking(bookingReference, userEmail);
      setTicket(data);
    } catch (err) {
      console.error('Failed to load ticket:', err);
      if (showToast) showToast('Failed to load digital ticket details', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `CineVerse Ticket: ${ticket?.movie_title}`,
        text: `My movie ticket for ${ticket?.movie_title} at ${ticket?.cinema_name} (Ref: ${ticket?.booking_reference})`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`CineVerse Booking Ref: ${ticket?.booking_reference} for ${ticket?.movie_title}`);
      if (showToast) showToast('Booking reference copied to clipboard!', 'info');
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '6rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        Generating your high-resolution digital ticket pass...
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="container" style={{ padding: '6rem 0', textAlign: 'center' }}>
        <h2>Ticket Not Found</h2>
        <p>Could not retrieve ticket with reference {bookingReference}.</p>
        <button className="btn btn-outline" onClick={onBackToHome} style={{ marginTop: '1rem' }}>
          <ArrowLeft size={16} /> Return to Catalog
        </button>
      </div>
    );
  }

  const isCancelled = ticket.booking_status === 'CANCELLED';
  const timeOnly = ticket.start_time.split(' ')[1] || ticket.start_time;
  const dateOnly = ticket.start_time.split(' ')[0];

  return (
    <div className="ticket-page-container container" style={{ padding: '2rem 1.5rem 6rem 1.5rem' }}>
      {/* Confirmation Top Message */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }} className="no-print">
        {!isCancelled ? (
          <>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--emerald-green)',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '0.5rem 1.25rem',
              borderRadius: 'var(--radius-full)',
              marginBottom: '0.75rem',
              fontWeight: '700',
              fontSize: '0.95rem'
            }}>
              <CheckCircle2 size={18} /> Booking Confirmed & Seats Reserved
            </div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: '900', color: '#fff' }}>
              You're Going to the Movies!
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Present this digital QR code ticket at the auditorium usher entrance
            </p>
          </>
        ) : (
          <div style={{
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.4)',
            padding: '1rem',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--ruby-red)',
            display: 'inline-block'
          }}>
            <h2>This Booking Was Cancelled</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Cancelled on {ticket.cancelled_at}. Refund processed.</p>
          </div>
        )}
      </div>

      {/* Ticket Pass Component */}
      <div className="ticket-wrapper">
        <div className="ticket-pass">
          {/* Header */}
          <div className="ticket-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div className="brand-icon" style={{ width: '32px', height: '32px' }}>
                <Film size={18} />
              </div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: '800', letterSpacing: '1px' }}>
                CINEVERSE <span>PASS</span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Booking Ref</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--gold-light)', letterSpacing: '1px' }}>
                {ticket.booking_reference}
              </div>
            </div>
          </div>

          {/* Ticket Body */}
          <div className="ticket-body">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '2rem',
              alignItems: 'center'
            }}>
              {/* Left Details */}
              <div>
                <span className="badge badge-gold" style={{ marginBottom: '0.5rem' }}>
                  {ticket.format_type}
                </span>

                <h2 style={{ fontSize: '1.6rem', fontWeight: '900', color: '#fff', marginBottom: '1rem', lineHeight: 1.2 }}>
                  {ticket.movie_title}
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={16} color="var(--gold-primary)" />
                    <span style={{ color: '#fff', fontWeight: '600' }}>{ticket.cinema_name}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={16} color="var(--cyan-neon)" />
                    <span>{dateOnly}</span>
                    <span>•</span>
                    <Clock size={16} color="var(--cyan-neon)" />
                    <span style={{ color: '#fff', fontWeight: '700' }}>{timeOnly}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Ticket size={16} color="var(--purple-vip)" />
                    <span>Hall: <strong>{ticket.hall_name}</strong></span>
                  </div>
                </div>

                {/* Seats List */}
                <div style={{ marginTop: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Assigned Reserved Seats:
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {(ticket.seats || []).map(s => (
                      <span key={s.id} className="badge badge-cyan" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
                        Row {s.row_label}-{s.seat_num}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Concessions if any */}
                {ticket.concessions && ticket.concessions.length > 0 && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gold-light)', fontWeight: '700', textTransform: 'uppercase' }}>
                      Concessions Voucher:
                    </div>
                    {ticket.concessions.map((c, i) => (
                      <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                        {c.quantity}x {c.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right QR Code Container */}
              <div style={{ textAlign: 'center' }}>
                <div className="ticket-qr-container">
                  {ticket.qr_code_data ? (
                    <img 
                      src={ticket.qr_code_data} 
                      alt={`QR for ${ticket.booking_reference}`}
                      style={{ width: '180px', height: '180px', display: 'block', margin: '0 auto' }}
                    />
                  ) : (
                    <div style={{ width: '180px', height: '180px', background: '#eee' }}>QR Code</div>
                  )}
                  <div style={{ color: '#000', fontSize: '0.75rem', fontWeight: '800', marginTop: '0.4rem', letterSpacing: '1px' }}>
                    SCAN AT ENTRANCE
                  </div>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                  Guest: <strong>{ticket.customer_name}</strong>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gold-light)', fontWeight: '700' }}>
                  Total Paid: ${ticket.total_amount ? ticket.total_amount.toFixed(2) : '0.00'}
                </div>
              </div>
            </div>
          </div>

          {/* Perforation Line */}
          <div className="ticket-perforation">
            <div className="perforation-line" />
          </div>

          {/* Footer of ticket */}
          <div style={{ padding: '1rem 2rem', background: 'rgba(10, 13, 20, 0.95)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>Admit {(ticket.seats || []).length} Person(s)</span>
            <span>Issued: {new Date(ticket.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="ticket-actions no-print" style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          marginTop: '2rem',
          flexWrap: 'wrap'
        }}>
          <button className="btn btn-outline-gold" onClick={handlePrint}>
            <Printer size={16} /> Print Ticket Pass
          </button>

          <button className="btn btn-outline" onClick={handleShare}>
            <Share2 size={16} /> Share Ticket
          </button>

          <button className="btn btn-primary" onClick={onViewBookings}>
            <Ticket size={16} /> View My Bookings
          </button>

          <button className="btn btn-ghost" onClick={onBackToHome}>
            Book Another Movie
          </button>
        </div>
      </div>
    </div>
  );
}
