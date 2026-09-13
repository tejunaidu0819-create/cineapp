import React from 'react';
import { X } from 'lucide-react';

export default function TrailerModal({ trailer, onClose }) {
  if (!trailer) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(0, 0, 0, 0.88)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem'
    }} onClick={onClose}>
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '960px',
        background: '#0d1017',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        border: '1px solid var(--border-focus)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)'
      }} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(18, 22, 33, 0.8)'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>
            Official Trailer: <span style={{ color: 'var(--gold-primary)' }}>{trailer.title}</span>
          </h3>
          <button 
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            style={{ borderRadius: '50%', padding: '0.4rem' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Video Embed */}
        <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', height: 0 }}>
          <iframe
            src={`${trailer.url}?autoplay=1`}
            title={trailer.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none'
            }}
          />
        </div>
      </div>
    </div>
  );
}
