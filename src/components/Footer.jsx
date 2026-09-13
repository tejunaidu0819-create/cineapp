import React from 'react';
import { Film, ShieldCheck, Sparkles, Award, Clock, Heart } from 'lucide-react';

export default function Footer({ navigate }) {
  return (
    <footer style={{
      background: '#07080c',
      borderTop: '1px solid var(--border-subtle)',
      padding: '4rem 0 3rem 0',
      marginTop: 'auto'
    }}>
      <div className="container">
        {/* Value Proposition Badges */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '2rem',
          paddingBottom: '3rem',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '3rem'
        }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-primary)', flexShrink: 0
            }}>
              <Award size={22} />
            </div>
            <div>
              <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>IMAX Laser & Dolby</h4>
              <p style={{ fontSize: '0.85rem' }}>Experience pristine 4K laser projection and immersive object-based Dolby Atmos audio.</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cyan-neon)', flexShrink: 0
            }}>
              <Sparkles size={22} />
            </div>
            <div>
              <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>VIP Recliner Seating</h4>
              <p style={{ fontSize: '0.85rem' }}>Motorized zero-gravity luxury loungers with personal food call buttons.</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ruby-red)', flexShrink: 0
            }}>
              <Clock size={22} />
            </div>
            <div>
              <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Instant QR Entry</h4>
              <p style={{ fontSize: '0.85rem' }}>Skip all queues with paperless digital passes on your mobile device.</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--emerald-green)', flexShrink: 0
            }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Guaranteed Cancellations</h4>
              <p style={{ fontSize: '0.85rem' }}>Free instant cancellations and full refunds up to 2 hours before showtime.</p>
            </div>
          </div>
        </div>

        {/* Main Footer Links */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
          color: 'var(--text-muted)',
          fontSize: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div className="brand-icon" style={{ width: '28px', height: '28px' }}>
              <Film size={16} />
            </div>
            <span style={{ color: '#fff', fontWeight: '700', letterSpacing: '1px' }}>CINEVERSE ENTERTAINMENT</span>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <a href="#privacy" onClick={(e) => e.preventDefault()} style={{ color: 'var(--text-secondary)' }}>Privacy Policy</a>
            <a href="#terms" onClick={(e) => e.preventDefault()} style={{ color: 'var(--text-secondary)' }}>Terms of Service</a>
            <a href="#faq" onClick={(e) => e.preventDefault()} style={{ color: 'var(--text-secondary)' }}>Help Center</a>
            <a 
              href="#admin" 
              onClick={(e) => { e.preventDefault(); navigate('admin'); }} 
              style={{ color: 'var(--cyan-neon)', fontWeight: '600' }}
            >
              Admin Portal
            </a>
          </div>

          <div>
            © {new Date().getFullYear()} CineVerse Inc. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
