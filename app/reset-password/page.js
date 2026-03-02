'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowser } from '../../lib/supabase-browser';

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [state, setState] = useState('loading'); // loading | ready | success | error
  const [error, setError] = useState('');

  useEffect(() => {
    // Supabase will auto-detect the recovery token from the URL hash
    // and set up the session. We just need to wait for it.
    const supabase = createSupabaseBrowser();
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setState('ready');
      }
    });

    // If already in a session (e.g., page refreshed), allow reset
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setState('ready');
    });

    // Timeout fallback if no event fires
    const timeout = setTimeout(() => {
      setState((prev) => (prev === 'loading' ? 'ready' : prev));
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setState('loading');
    const supabase = createSupabaseBrowser();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setState('ready');
    } else {
      setState('success');
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <img
          src="/logo/padmagnet-icon-120.png"
          alt="PadMagnet"
          width={48}
          height={48}
          style={{ borderRadius: 10, marginBottom: 16 }}
        />
        <h1 style={styles.title}>Reset Your Password</h1>

        {state === 'success' ? (
          <div>
            <p style={styles.success}>Password updated successfully.</p>
            <p style={styles.hint}>You can now sign in with your new password in the PadMagnet app.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label style={styles.label}>New Password</label>
            <div style={styles.inputWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                style={styles.input}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>

            <label style={styles.label}>Confirm Password</label>
            <div style={styles.inputWrapper}>
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                style={styles.input}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                style={styles.eyeButton}
              >
                <EyeIcon open={showConfirm} />
              </button>
            </div>

            {error && <p style={styles.error}>{error}</p>}

            <button
              type="submit"
              disabled={state === 'loading'}
              style={styles.button}
            >
              {state === 'loading' ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B1D3A',
    padding: 24,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    backgroundColor: '#122847',
    borderRadius: 16,
    padding: 40,
    maxWidth: 500,
    width: '100%',
    textAlign: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 28,
  },
  label: {
    display: 'block',
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: 500,
    textAlign: 'left',
    marginBottom: 8,
  },
  inputWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    padding: '14px 48px 14px 16px',
    borderRadius: 8,
    border: '1px solid #1E3A5F',
    backgroundColor: '#1A3358',
    color: '#FFFFFF',
    fontSize: 18,
    outline: 'none',
    boxSizing: 'border-box',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
  },
  button: {
    width: '100%',
    padding: '16px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: '#3B82F6',
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 10,
  },
  error: {
    color: '#EF4444',
    fontSize: 16,
    marginBottom: 10,
  },
  success: {
    color: '#22C55E',
    fontSize: 20,
    fontWeight: 600,
    marginBottom: 10,
  },
  hint: {
    color: '#94A3B8',
    fontSize: 17,
  },
};
