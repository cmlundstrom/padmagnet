'use client';

import { useState, useEffect, Suspense } from 'react';
import { createSupabaseBrowser } from '../../../lib/supabase-browser';
import { useRouter, useSearchParams } from 'next/navigation';

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

export default function AdminLoginPageWrapper() {
  return (
    <Suspense fallback={null}>
      <AdminLoginPage />
    </Suspense>
  );
}

function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login'); // login | forgot | sent
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('error') === 'unauthorized') {
      setError('Your account does not have admin access.');
    }
  }, [searchParams]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createSupabaseBrowser();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError('Invalid email or password');
      setLoading(false);
      return;
    }

    router.push('/admin');
    router.refresh();
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createSupabaseBrowser();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMode('sent');
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
          }}>PadMagnet Admin</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>
            {mode === 'login' && 'Sign in to access the dashboard'}
            {mode === 'forgot' && 'Enter your email to reset your password'}
            {mode === 'sent' && 'Check your inbox'}
          </p>
        </div>

        {/* Reset email sent confirmation */}
        {mode === 'sent' && (
          <div>
            <div style={{
              padding: '16px', marginBottom: 20,
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              borderRadius: 8, fontSize: 13, color: '#4ade80',
              fontWeight: 600, textAlign: 'center', lineHeight: 1.5,
            }}>
              Password reset link sent to <strong>{email}</strong>. Check your email and click the link to set a new password.
            </div>
            <button
              onClick={() => { setMode('login'); setError(''); }}
              style={{
                width: '100%', padding: '12px 0',
                background: '#22d3ee', color: '#000',
                border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 700,
                fontFamily: "'DM Sans', sans-serif",
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              Back to Sign In
            </button>
          </div>
        )}

        {/* Login Form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="admin@padmagnet.com"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#22d3ee'}
                onBlur={e => e.target.style.borderColor = '#1e293b'}
              />
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Enter password"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#22d3ee'}
                onBlur={e => e.target.style.borderColor = '#1e293b'}
              />
            </div>

            <div style={{ textAlign: 'right', marginBottom: 20 }}>
              <button
                type="button"
                onClick={() => { setMode('forgot'); setError(''); }}
                style={{
                  background: 'none', border: 'none', color: '#22d3ee',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif", padding: 0,
                }}
              >
                Forgot password?
              </button>
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
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* Forgot Password Form */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword}>
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="admin@padmagnet.com"
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
                marginBottom: 12,
              }}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              style={{
                width: '100%', padding: '10px 0',
                background: 'transparent', color: '#94a3b8',
                border: `1px solid #1e293b`, borderRadius: 8,
                fontSize: 13, fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              Back to Sign In
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
