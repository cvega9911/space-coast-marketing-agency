/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source:      '/:path*',
        has:         [{ type: 'host', value: 'www.spacecoastmarketingagency.com' }],
        destination: 'https://spacecoastmarketingagency.com/:path*',
        permanent:   true,
      },
      {
        source:      '/:path*',
        has:         [{ type: 'host', value: 'presencify.co' }],
        destination: 'https://spacecoastmarketingagency.com/:path*',
        permanent:   true,
      },
      {
        source:      '/:path*',
        has:         [{ type: 'host', value: 'www.presencify.co' }],
        destination: 'https://spacecoastmarketingagency.com/:path*',
        permanent:   true,
      },
    ]
  },
}

export default nextConfig
