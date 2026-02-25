import './globals.css';

export const metadata = {
  title: 'PadMagnet — Swipe to Find Your Next Home',
  description: 'Tinder-style rental matching for tenants and landlords. Find your perfect pad in Martin and St. Lucie County.',
  openGraph: {
    title: 'PadMagnet — Swipe to Find Your Next Home',
    description: 'Tinder-style rental matching for tenants and landlords.',
    url: 'https://padmagnet.com',
    siteName: 'PadMagnet',
    type: 'website',
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
