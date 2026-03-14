import './globals.css';
import './app-theme.css';

export const metadata = {
  title: 'PadMagnet — Find Your Perfect Rental with PadScore™',
  description: 'Better Matches. Better Homes. PadScore™ connects tenants to owner-listed rentals that fit, fast.',
  icons: {
    icon: [
      { url: '/logo/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo/favicon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/logo/padmagnet-icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/logo/padmagnet-icon-120.png', sizes: '120x120' },
    ],
  },
  openGraph: {
    title: 'PadMagnet — Find Your Perfect Rental with PadScore™',
    description: 'Better Matches. Better Homes. PadScore™ connects tenants to owner-listed rentals that fit, fast.',
    url: 'https://padmagnet.com',
    siteName: 'PadMagnet',
    type: 'website',
    images: [{ url: '/logo/padmagnet-social-400.png', width: 400, height: 400 }],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=DM+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
