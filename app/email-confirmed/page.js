export const metadata = {
  title: 'Email Confirmed — PadMagnet',
};

export default function EmailConfirmedPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--pm-navy)',
      padding: 'var(--pm-space-lg)',
      fontFamily: 'var(--pm-font-body)',
    }}>
      <div style={{
        backgroundColor: 'var(--pm-surface)',
        borderRadius: 'var(--pm-radius-lg)',
        padding: '40px',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center',
      }}>
        <img
          src="/logo/padmagnet-icon-120.png"
          alt="PadMagnet"
          width={56}
          height={56}
          style={{ borderRadius: '10px', marginBottom: '16px' }}
        />
        <h1 style={{
          color: 'var(--pm-text)',
          fontFamily: 'var(--pm-font-heading)',
          fontSize: 'var(--pm-fs-2xl)',
          fontWeight: 700,
          marginBottom: '12px',
        }}>
          Email Updated
        </h1>
        <p style={{
          color: 'var(--pm-success)',
          fontSize: '20px',
          fontWeight: 600,
          marginBottom: '10px',
        }}>
          Your email address has been changed successfully.
        </p>
        <p style={{
          color: 'var(--pm-text-secondary)',
          fontSize: '17px',
          marginBottom: '24px',
        }}>
          You can close this page and return to the PadMagnet app.
        </p>
        <p style={{
          color: 'var(--pm-slate)',
          fontSize: '13px',
        }}>
          Your profile has been updated automatically. The new email will appear the next time you open the app.
        </p>
      </div>
    </div>
  );
}
