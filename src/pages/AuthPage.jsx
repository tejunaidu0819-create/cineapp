import React, { useState } from 'react';
import { 
  User, 
  Lock, 
  Mail, 
  Phone, 
  Film, 
  ShieldCheck, 
  Sparkles, 
  ArrowLeft,
  KeyRound
} from 'lucide-react';
import { api } from '../services/api';

export default function AuthPage({ onLoginSuccess, onBack, showToast }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        const res = await api.register({ email, password, fullName, phone });
        if (showToast) showToast('🎉 Account registered successfully! Welcome to CineVerse.', 'success');
        onLoginSuccess(res.user);
      } else {
        const res = await api.login(email, password);
        if (showToast) showToast(`Welcome back, ${res.user.full_name}!`, 'success');
        onLoginSuccess(res.user);
      }
    } catch (err) {
      console.error('Auth error:', err);
      if (showToast) showToast(err.message || 'Authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const quickFillAdmin = () => {
    setIsRegister(false);
    setEmail('admin@cineverse.com');
    setPassword('admin123');
  };

  const quickFillCustomer = () => {
    setIsRegister(false);
    setEmail('alex@cineapp.com');
    setPassword('user123');
  };

  return (
    <div className="auth-page container" style={{ padding: '3rem 1.5rem 6rem 1.5rem', maxWidth: '540px' }}>
      <button className="btn btn-outline btn-sm" onClick={onBack} style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className="glass-card" style={{ padding: '2.5rem', border: '1px solid var(--border-focus)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="brand-icon" style={{ width: '48px', height: '48px', margin: '0 auto 1rem auto' }}>
            <Film size={26} />
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#fff' }}>
            {isRegister ? 'Join CineVerse Club' : 'Sign In to CineVerse'}
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {isRegister 
              ? 'Earn reward points, reserve seats faster, and access VIP lounge passes'
              : 'Access your tickets, points, and exclusive movie premieres'}
          </p>
        </div>

        {/* Quick Demo Fill Buttons */}
        <div style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px dashed rgba(245, 158, 11, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          marginBottom: '1.75rem'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--gold-light)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <KeyRound size={13} /> Demo Accounts Quick-Fill
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button 
              type="button" 
              className="btn btn-outline-gold btn-sm"
              onClick={quickFillCustomer}
              style={{ flex: 1 }}
            >
              <User size={14} /> Demo Customer
            </button>
            <button 
              type="button" 
              className="btn btn-cyan btn-sm"
              onClick={quickFillAdmin}
              style={{ flex: 1 }}
            >
              <ShieldCheck size={14} /> Demo Admin
            </button>
          </div>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {isRegister && (
            <>
              <div className="filter-group">
                <span className="filter-label">Full Name</span>
                <div className="filter-input-wrap">
                  <User size={16} color="var(--text-muted)" />
                  <input
                    type="text"
                    placeholder="e.g. Jordan Smith"
                    className="filter-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="filter-group">
                <span className="filter-label">Phone Number</span>
                <div className="filter-input-wrap">
                  <Phone size={16} color="var(--text-muted)" />
                  <input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    className="filter-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div className="filter-group">
            <span className="filter-label">Email Address</span>
            <div className="filter-input-wrap">
              <Mail size={16} color="var(--text-muted)" />
              <input
                type="email"
                placeholder="name@cineverse.com"
                className="filter-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="filter-group">
            <span className="filter-label">Password</span>
            <div className="filter-input-wrap">
              <Lock size={16} color="var(--text-muted)" />
              <input
                type="password"
                placeholder="••••••••"
                className="filter-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Authenticating...' : (isRegister ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        {/* Toggle Register / Login */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {isRegister ? (
            <span>
              Already have an account?{' '}
              <button 
                type="button" 
                onClick={() => setIsRegister(false)}
                style={{ color: 'var(--gold-primary)', fontWeight: '700', textDecoration: 'underline' }}
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Don't have an account?{' '}
              <button 
                type="button" 
                onClick={() => setIsRegister(true)}
                style={{ color: 'var(--gold-primary)', fontWeight: '700', textDecoration: 'underline' }}
              >
                Create Account (Get 50 pts)
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
