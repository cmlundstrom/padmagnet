// Shared app-store badge row. Single source of truth for BOTH the homepage and
// the public listing share-link landing page (and any future public surface).
//
// Order is intentional: Google Play (live) FIRST, App Store (coming soon) second.
// The App Store badge is a non-clickable placeholder until iOS launches — when it
// goes live, flip APP_STORE_LIVE to true and fill in APP_STORE_URL. See the
// project TODO "update App Store share link once live".

export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.padmagnet.app';

// iOS not launched yet. When it is: set APP_STORE_LIVE = true and APP_STORE_URL.
export const APP_STORE_LIVE = false;
export const APP_STORE_URL = ''; // e.g. 'https://apps.apple.com/app/padmagnet/idXXXXXXXXX'

function GooglePlayIcon() {
  return (
    <svg className="store-btn-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.609 1.814a1 1 0 0 0-.609.92v18.532a1 1 0 0 0 .609.92L13.792 12 3.609 1.814z" fill="#00C8DA" />
      <path d="M16.81 8.989l-3.018 3.011 3.018 3.012 3.853-2.218a1 1 0 0 0 0-1.588L16.81 8.989z" fill="#FFCF47" />
      <path d="M3.609 1.814l10.183 10.186 3.018-3.011L4.67 1.71a1 1 0 0 0-1.06.103z" fill="#00F076" />
      <path d="M13.792 12L3.609 22.186a1 1 0 0 0 1.06.103l12.141-7.277L13.792 12z" fill="#FF3A44" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="store-btn-icon" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M17.05 12.536c-.026-2.737 2.226-4.054 2.328-4.118-1.27-1.854-3.247-2.108-3.95-2.137-1.68-.17-3.281 1.005-4.135 1.005-.866 0-2.168-.98-3.566-.953-1.834.027-3.523 1.058-4.467 2.687-1.905 3.296-.487 8.176 1.367 10.847.91 1.302 1.99 2.764 3.408 2.711 1.37-.054 1.885-.886 3.539-.886 1.642 0 2.117.886 3.55.853 1.466-.027 2.395-1.328 3.292-2.633 1.038-1.509 1.467-2.973 1.493-3.05-.033-.013-2.835-1.085-2.86-4.326zM14.38 4.456c.748-.912 1.255-2.18 1.116-3.452-1.078.046-2.397.722-3.171 1.633-.694.81-1.305 2.105-1.144 3.343 1.203.094 2.434-.61 3.198-1.524z" />
    </svg>
  );
}

export default function StoreButtons({ variant = 'light' }) {
  return (
    <div className={`store-buttons ${variant === 'dark' ? 'store-buttons-dark' : ''}`}>
      {/* Google Play — live, links to the Play Store */}
      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="store-btn store-btn-live"
        aria-label="Get PadMagnet on Google Play"
      >
        <GooglePlayIcon />
        <span className="store-btn-text">
          <span className="store-btn-small">GET IT ON</span>
          <span className="store-btn-large">Google Play</span>
        </span>
      </a>

      {/* App Store — coming soon (non-clickable until iOS launches) */}
      {APP_STORE_LIVE ? (
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="store-btn store-btn-live"
          aria-label="Download PadMagnet on the App Store"
        >
          <AppleIcon />
          <span className="store-btn-text">
            <span className="store-btn-small">DOWNLOAD ON THE</span>
            <span className="store-btn-large">App Store</span>
          </span>
        </a>
      ) : (
        <div className="store-btn store-btn-soon" aria-label="iOS App Store coming soon">
          <AppleIcon />
          <span className="store-btn-text">
            <span className="store-btn-small">COMING SOON TO</span>
            <span className="store-btn-large">App Store</span>
          </span>
          <span className="store-btn-soon-tag">SOON</span>
        </div>
      )}
    </div>
  );
}
