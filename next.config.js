/** @type {import('next').NextConfig} */
const nextConfig = {
  // Serve static HTML from public/ as the primary UI
  async rewrites() {
    return [
      { source: '/', destination: '/index.html' },
      { source: '/login', destination: '/index.html' },
      { source: '/signup', destination: '/signup.html' },
      { source: '/dashboard', destination: '/dashboard.html' },
      { source: '/profile', destination: '/profile.html' },
      { source: '/projects', destination: '/projects.html' },
      { source: '/settings', destination: '/settings.html' },
    ];
  },
};

module.exports = nextConfig;
