'use client';

import { useState } from 'react';
import { createSupabaseBrowser } from '../../../lib/supabase-browser';
import { useRouter } from 'next/navigation';

export default function SetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const supabase = createSupabaseBrowser();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    router.push('/admin');
    router.refresh();
  };

  const inputStyle = {
    width: '100%', padding: '12px 14px',
    background: '#0A0E17', border: '1px solid #1e293b',
    borderRadius: 8, color: '#e2e8f0', fontSize: 14,
    fontFamily: "'DM Sans', sans-serif", outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  };

  const labelStyle = {
    display: 'block', fontSize: 11, fontWeight: 700,
    color: '#64748b', textTransform: 'uppercase',
    letterSpacing: '0.05em', marginBottom: 6,
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0E17',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'DM Sans', -apple-system, sans-serif",
      padding: 24,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Outfit:wght@700;800;900&display=swap" rel="stylesheet" />

      <div style={{
        width: '100%',
        maxWidth: 400,
        background: '#111827',
        borderRadius: 16,
        border: '1px solid #1e293b',
        padding: '40px 36px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img
            src="/logo/padmagnet-icon-120.png"
            alt="PadMagnet"
            width={48}
            height={48}
            style={{ borderRadius: 12, marginBottom: 12 }}
          />
          <h1 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 22, fontWeight: 800, color: '#e2e8f0',
            letterSpacing: '-0.02em', margin: 0,
          }}>Welcome to PadMagnet</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>
            Create a password to secure your admin account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoFocus
              placeholder="At least 8 characters"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#22d3ee'}
              onBlur={e => e.target.style.borderColor = '#1e293b'}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              placeholder="Re-enter password"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#22d3ee'}
              onBlur={e => e.target.style.borderColor = '#1e293b'}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', marginBottom: 16,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 8, fontSize: 13, color: '#f87171',
              fontWeight: 600,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px 0',
              background: loading ? '#1e293b' : '#22d3ee',
              color: loading ? '#64748b' : '#000',
              border: 'none', borderRadius: 8,
              fontSize: 14, fontWeight: 700,
              fontFamily: "'DM Sans', sans-serif",
              cursor: loading ? 'default' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {loading ? 'Setting password...' : 'Set Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
