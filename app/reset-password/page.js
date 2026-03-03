'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowser } from '../../lib/supabase-browser';
import styles from './reset-password.module.css';

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B0BEC5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B0BEC5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    const supabase = createSupabaseBrowser();

    async function initSession() {
      // 1. Check for hash tokens (recovery flow)
      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!sessionError) {
            setState('ready');
            window.history.replaceState({}, '', '/reset-password');
            return;
          }
        }
      }

      // 2. Check for PKCE code in query params
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (!exchangeError) {
          setState('ready');
          window.history.replaceState({}, '', '/reset-password');
          return;
        }
      }

      // 3. Check existing session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setState('ready');
        return;
      }
    }

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setState('ready');
      }
    });

    initSession().then(() => {
      // Fallback if nothing worked after 3s
      setTimeout(() => {
        setState((prev) => (prev === 'loading' ? 'ready' : prev));
      }, 3000);
    });

    return () => subscription.unsubscribe();
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
    <div className={`app-theme ${styles.page}`}>
      <div className={styles.card}>
        <img
          src="/logo/padmagnet-icon-120.png"
          alt="PadMagnet"
          width={48}
          height={48}
          className={styles.logo}
        />
        <h1 className={styles.title}>Reset Your Password</h1>

        {state === 'success' ? (
          <div>
            <p className={styles.success}>Password updated successfully.</p>
            <p className={styles.hint}>Sign in with your new password.</p>
            <button
              onClick={() => window.close()}
              className={styles.button}
            >
              Back to App
            </button>
            <p className={styles.hintSmall}>
              If the button doesn&apos;t close this page, just switch back to the app manually.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className={styles.label}>New Password</label>
            <div className={styles.inputWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className={styles.input}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.eyeButton}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>

            <label className={styles.label}>Confirm Password</label>
            <div className={styles.inputWrapper}>
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                className={styles.input}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className={styles.eyeButton}
              >
                <EyeIcon open={showConfirm} />
              </button>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button
              type="submit"
              disabled={state === 'loading'}
              className={styles.button}
            >
              {state === 'loading' ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
