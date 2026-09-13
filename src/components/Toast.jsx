import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 size={20} color="var(--emerald-green)" />,
    error: <XCircle size={20} color="var(--ruby-red)" />,
    warning: <AlertTriangle size={20} color="var(--gold-primary)" />,
    info: <Info size={20} color="var(--cyan-neon)" />
  };

  const borderColors = {
    success: 'rgba(16, 185, 129, 0.4)',
    error: 'rgba(244, 63, 94, 0.4)',
    warning: 'rgba(245, 158, 11, 0.4)',
    info: 'rgba(6, 182, 212, 0.4)'
  };

  return (
    <div style={{
      position: 'fixed',
      top: '90px',
      right: '24px',
      zIndex: 10000,
      background: 'rgba(18, 22, 33, 0.95)',
      backdropFilter: 'blur(20px)',
      border: `1px solid ${borderColors[toast.type || 'info']}`,
      borderRadius: 'var(--radius-lg)',
      padding: '1rem 1.25rem',
      boxShadow: 'var(--shadow-lg), 0 10px 30px rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.85rem',
      maxWidth: '420px',
      animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <div>{icons[toast.type || 'info']}</div>
      <div style={{ flex: 1, fontSize: '0.9rem', color: 'var(--text-white)' }}>
        {toast.message}
      </div>
      <button 
        onClick={onClose}
        style={{ color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
