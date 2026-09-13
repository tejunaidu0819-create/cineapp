import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  CreditCard, 
  ShieldCheck, 
  Tag, 
  Sparkles, 
  Plus, 
  Minus, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  CheckCircle,
  Ticket,
  Popcorn
} from 'lucide-react';
import { api } from '../services/api';

export default function CheckoutPage({ 
  bookingDraft, 
  currentUser, 
  onBack, 
  onBookingSuccess,
  showToast 
}) {
  const { showtime, seats } = bookingDraft || {};

  // Concessions state
  const [concessions, setConcessions] = useState([]);
  const [cartConcessions, setCartConcessions] = useState({}); // { [concessionId]: quantity }

  // Customer details form
  const [customerName, setCustomerName] = useState(currentUser?.full_name || '');
  const [customerEmail, setCustomerEmail] = useState(currentUser?.email || '');
  const [customerPhone, setCustomerPhone] = useState(currentUser?.phone || '+1 (555) 234-5678');

  // Promo code
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null); // { code: 'CINEVIP20', discount: 10, type: 'percent' }

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState('CREDIT_CARD');
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8821');
  const [cardExpiry, setCardExpiry] = useState('08/28');
  const [cardCvc, setCardCvc] = useState('842');

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadConcessions();
    if (currentUser) {
      if (!customerName) setCustomerName(currentUser.full_name);
      if (!customerEmail) setCustomerEmail(currentUser.email);
      if (currentUser.phone && !customerPhone) setCustomerPhone(currentUser.phone);
    }
  }, [currentUser]);

  async function loadConcessions() {
    try {
      const data = await api.getConcessions();
      setConcessions(data);
    } catch (e) {
      console.error('Failed to load concessions:', e);
    }
  }

  if (!showtime || !seats || seats.length === 0) {
    return (
      <div className="container" style={{ padding: '6rem 0', textAlign: 'center' }}>
        <h2>No Active Booking Draft</h2>
        <p>Please select a movie and seats first.</p>
        <button className="btn btn-outline" onClick={onBack} style={{ marginTop: '1rem' }}>
          <ArrowLeft size={16} /> Return to Movies
        </button>
      </div>
    );
  }

  const updateConcessionQty = (id, delta) => {
    setCartConcessions(prev => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  };

  // Calculations
  const seatsSubtotal = seats.reduce((sum, s) => sum + s.price, 0);
  const concessionsSubtotal = Object.entries(cartConcessions).reduce((sum, [id, qty]) => {
    const item = concessions.find(c => c.id === Number(id));
    return sum + (item ? item.price * qty : 0);
  }, 0);

  const bookingFee = Number((seats.length * 1.75).toFixed(2));
  const preDiscountTotal = seatsSubtotal + concessionsSubtotal + bookingFee;

  let discountAmount = 0;
  if (appliedPromo) {
    if (appliedPromo.type === 'percent') {
      discountAmount = Number(((preDiscountTotal * appliedPromo.value) / 100).toFixed(2));
    } else {
      discountAmount = Number(appliedPromo.value);
    }
  }

  const finalTotal = Math.max(0, Number((preDiscountTotal - discountAmount).toFixed(2)));

  const handleApplyPromo = (e) => {
    e.preventDefault();
    const clean = promoInput.trim().toUpperCase();
    if (clean === 'CINEVIP20') {
      setAppliedPromo({ code: 'CINEVIP20', value: 20, type: 'percent' });
      if (showToast) showToast('🎉 Promo code CINEVIP20 applied! 20% discount granted.', 'success');
    } else if (clean === 'WELCOME10') {
      setAppliedPromo({ code: 'WELCOME10', value: 10, type: 'fixed' });
      if (showToast) showToast('🎉 Promo code WELCOME10 applied! $10.00 discount granted.', 'success');
    } else {
      if (showToast) showToast('Invalid promo code. Try "CINEVIP20" or "WELCOME10"', 'error');
    }
  };

  const handleCompleteBooking = async (e) => {
    e.preventDefault();

    if (!customerName || !customerEmail || !customerPhone) {
      if (showToast) showToast('Please enter your full name, email, and phone number.', 'error');
      return;
    }

    try {
      setSubmitting(true);

      const concessionItems = Object.entries(cartConcessions).map(([id, qty]) => {
        const item = concessions.find(c => c.id === Number(id));
        return {
          id: Number(id),
          quantity: qty,
          price: item ? item.price : 0
        };
      });

      const payload = {
        showtimeId: showtime.id,
        seats,
        customerName,
        customerEmail,
        customerPhone,
        paymentMethod,
        concessions: concessionItems,
        discountAmount,
        userId: currentUser?.id || null
      };

      const res = await api.createBooking(payload);

      if (showToast) showToast('🎟️ Tickets booked successfully! Enjoy your movie!', 'success');
      onBookingSuccess(res.booking.bookingReference, customerEmail);
    } catch (err) {
      console.error('Booking failed:', err);
      if (showToast) showToast(err.message || 'Booking transaction failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const timeOnly = showtime.start_time.split(' ')[1] || showtime.start_time;
  const dateOnly = showtime.start_time.split(' ')[0];

  return (
    <div className="checkout-page container" style={{ padding: '3rem 1.5rem 6rem 1.5rem' }}>
      <button className="btn btn-outline btn-sm" onClick={onBack} style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={16} /> Back to Seat Map
      </button>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '2.5rem',
        alignItems: 'flex-start'
      }}>
        {/* Left Column: Concessions & Guest Details & Payment */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* 1. Concessions & Snack Bar */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <Popcorn size={22} color="var(--gold-primary)" />
              <h2 style={{ fontSize: '1.3rem', fontWeight: '800' }}>Cinema Gourmet Concessions</h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Add freshly prepared artisan snacks, popcorn, and signature drinks delivered to your seat
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {concessions.map(c => {
                const qty = cartConcessions[c.id] || 0;
                return (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.9rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-subtle)',
                      gap: '1rem'
                    }}
                  >
                    <img 
                      src={c.image_url} 
                      alt={c.name}
                      style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#fff' }}>{c.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.description}</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--gold-light)', marginTop: '0.2rem' }}>
                        ${c.price.toFixed(2)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-outline btn-sm"
                        style={{ width: '30px', height: '30px', padding: 0 }}
                        onClick={() => updateConcessionQty(c.id, -1)}
                        disabled={qty === 0}
                      >
                        <Minus size={13} />
                      </button>
                      <span style={{ fontWeight: '700', minWidth: '20px', textAlign: 'center' }}>{qty}</span>
                      <button 
                        className="btn btn-outline-gold btn-sm"
                        style={{ width: '30px', height: '30px', padding: 0 }}
                        onClick={() => updateConcessionQty(c.id, 1)}
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Customer Contact Info */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <User size={22} color="var(--cyan-neon)" />
              <h2 style={{ fontSize: '1.3rem', fontWeight: '800' }}>Contact & Ticket Delivery</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="filter-group">
                <span className="filter-label"><User size={12} /> Full Legal Name</span>
                <div className="filter-input-wrap">
                  <input 
                    type="text" 
                    placeholder="e.g. Alex Morgan"
                    className="filter-input"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="filter-group">
                  <span className="filter-label"><Mail size={12} /> Email for Digital Ticket</span>
                  <div className="filter-input-wrap">
                    <input 
                      type="email" 
                      placeholder="alex@example.com"
                      className="filter-input"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="filter-group">
                  <span className="filter-label"><Phone size={12} /> Mobile Phone Number</span>
                  <div className="filter-input-wrap">
                    <input 
                      type="tel" 
                      placeholder="+1 (555) 000-0000"
                      className="filter-input"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Secure Payment Method */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <CreditCard size={22} color="var(--emerald-green)" />
              <h2 style={{ fontSize: '1.3rem', fontWeight: '800' }}>Payment Method</h2>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {[
                { id: 'CREDIT_CARD', label: 'Credit / Debit Card' },
                { id: 'APPLE_PAY', label: 'Apple Pay' },
                { id: 'GOOGLE_PAY', label: 'Google Pay' },
                { id: 'CINEMA_CASH', label: 'Cinema Pay' }
              ].map(method => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPaymentMethod(method.id)}
                  className={`btn ${paymentMethod === method.id ? 'btn-outline-gold' : 'btn-outline'} btn-sm`}
                >
                  {method.label}
                </button>
              ))}
            </div>

            {paymentMethod === 'CREDIT_CARD' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="filter-group">
                  <span className="filter-label">Card Number</span>
                  <div className="filter-input-wrap">
                    <input 
                      type="text" 
                      className="filter-input"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="filter-group">
                    <span className="filter-label">Expiration Date</span>
                    <div className="filter-input-wrap">
                      <input 
                        type="text" 
                        className="filter-input"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="filter-group">
                    <span className="filter-label">Security CVC</span>
                    <div className="filter-input-wrap">
                      <input 
                        type="password" 
                        className="filter-input"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Order Summary & Promo Code */}
        <div style={{ position: 'sticky', top: '100px' }}>
          <div className="glass-card" style={{ padding: '2rem', border: '1px solid var(--border-focus)' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
              Booking Summary
            </h2>

            {/* Movie Info */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <img 
                src={showtime.poster_url} 
                alt={showtime.movie_title}
                style={{ width: '60px', height: '88px', objectFit: 'cover', borderRadius: 'var(--radius-md)' }}
              />
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>{showtime.movie_title}</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{showtime.cinema_name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{showtime.hall_name}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--gold-light)', fontWeight: '700', marginTop: '0.2rem' }}>
                  {dateOnly} • {timeOnly}
                </div>
              </div>
            </div>

            {/* Seats List */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Selected Seats ({seats.length})
              </div>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {seats.map(s => (
                  <span key={s.id} className="badge badge-cyan" style={{ fontSize: '0.75rem' }}>
                    {s.row_label}{s.seat_num} (${s.price.toFixed(2)})
                  </span>
                ))}
              </div>
            </div>

            {/* Promo Code Input */}
            <form onSubmit={handleApplyPromo} style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div className="filter-input-wrap" style={{ flex: 1 }}>
                  <Tag size={14} color="var(--gold-primary)" />
                  <input 
                    type="text" 
                    placeholder="Promo Code (e.g. CINEVIP20)" 
                    className="filter-input"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-outline-gold btn-sm">
                  Apply
                </button>
              </div>
              {appliedPromo && (
                <div style={{ fontSize: '0.75rem', color: 'var(--emerald-green)', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <CheckCircle size={12} /> Promo {appliedPromo.code} applied (-${discountAmount.toFixed(2)})
                </div>
              )}
            </form>

            {/* Price Breakdown */}
            <div style={{
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
              fontSize: '0.9rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Tickets Subtotal</span>
                <span>${seatsSubtotal.toFixed(2)}</span>
              </div>

              {concessionsSubtotal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Snacks & Concessions</span>
                  <span>${concessionsSubtotal.toFixed(2)}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Convenience & Booking Fee</span>
                <span>${bookingFee.toFixed(2)}</span>
              </div>

              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--emerald-green)' }}>
                  <span>Promo Discount ({appliedPromo?.code})</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1.3rem',
                fontWeight: '900',
                color: '#fff',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '0.75rem',
                marginTop: '0.25rem'
              }}>
                <span>Total Due</span>
                <span style={{ color: 'var(--gold-light)' }}>${finalTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              disabled={submitting}
              onClick={handleCompleteBooking}
            >
              <Lock size={18} />
              {submitting ? 'Processing Payment...' : `Pay $${finalTotal.toFixed(2)} & Get Ticket`}
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
              🔒 256-bit Encrypted Checkout • Instant QR Ticket Delivery
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
