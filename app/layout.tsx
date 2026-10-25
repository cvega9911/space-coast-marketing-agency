import type { Metadata } from 'next'
import { IBM_Plex_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title:       'Space Coast Marketing Agency — Websites & Marketing for Brevard',
  description: 'Professional websites and full-service marketing for Brevard County businesses. 72-hour preview, $599 flat, no contracts. Serving Melbourne, Cocoa Beach, Titusville, Palm Bay, Merritt Island, and the Space Coast.',
  alternates:  { canonical: 'https://spacecoastmarketingagency.com' },
  icons:       { icon: '/brand/icon.svg' },
  openGraph: {
    title:       'Space Coast Marketing Agency — Amplify Your Presence.',
    description: 'Professional websites and full-service marketing for Brevard County businesses. 72-hour preview, $599 flat, no contracts.',
    url:         'https://spacecoastmarketingagency.com',
    siteName:    'Space Coast Marketing Agency',
    locale:      'en_US',
    type:        'website',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'Space Coast Marketing Agency — Websites & Marketing for Brevard',
    description: '72-hour preview. $599 flat. No contracts. Space Coast based.',
  },
}

const LOCAL_BUSINESS_SCHEMA = {
  '@context': 'https://schema.org',
  '@type':    'LocalBusiness',
  name:       'Space Coast Marketing Agency',
  url:        'https://spacecoastmarketingagency.com',
  email:      'info@spacecoastmarketingagency.com',
  telephone:  '+1-321-328-5307',
  description: 'Professional websites and full-service marketing for Brevard County businesses. 72-hour preview, $599 flat, no contracts.',
  sameAs: ['https://g.page/spacecoastmarketingagency'],
  address: {
    '@type':         'PostalAddress',
    addressLocality: 'Merritt Island',
    addressRegion:   'FL',
    addressCountry:  'US',
  },
  areaServed: [
    { '@type': 'City', name: 'Cocoa Beach'   },
    { '@type': 'City', name: 'Melbourne'      },
    { '@type': 'City', name: 'Titusville'     },
    { '@type': 'City', name: 'Palm Bay'       },
    { '@type': 'City', name: 'Rockledge'      },
    { '@type': 'City', name: 'Merritt Island' },
    { '@type': 'City', name: 'Cocoa'          },
    { '@type': 'City', name: 'Cape Canaveral' },
  ],
  serviceArea: { '@type': 'AdministrativeArea', name: 'Brevard County, Florida' },
  priceRange:  '$599–$1500',
  serviceType: ['Web Design', 'Local SEO', 'Social Media Marketing', 'Website Hosting'],
  offers: {
    '@type':       'Offer',
    price:         '599',
    priceCurrency: 'USD',
    description:   '5-page professional website, mobile responsive, 72-hour preview delivery',
  },
}

const WEBSITE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type':    'WebSite',
  name:       'Space Coast Marketing Agency',
  url:        'https://spacecoastmarketingagency.com',
  potentialAction: {
    '@type':       'SearchAction',
    target:        'https://spacecoastmarketingagency.com/?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ibmPlexSans.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(LOCAL_BUSINESS_SCHEMA) }} />
        <script type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_SCHEMA) }} />
      </head>
      <body className={`antialiased bg-[#0a0a14] text-[#F5F5F0] ${ibmPlexSans.className}`}>
        {children}
      </body>
    </html>
  )
}
