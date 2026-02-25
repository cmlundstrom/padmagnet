/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow images from Supabase storage and Cloudinary
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
};

module.exports = nextConfig;
