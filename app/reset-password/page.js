'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowser } from '../../lib/supabase-browser';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              style={styles.input}
              autoFocus
            />

            <label style={styles.label}>Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat password"
              style={styles.input}
            />

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
  input: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: 8,
    border: '1px solid #1E3A5F',
    backgroundColor: '#1A3358',
    color: '#FFFFFF',
    fontSize: 18,
    marginBottom: 20,
    outline: 'none',
    boxSizing: 'border-box',
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
