import type { Metadata } from 'next'
import Image from 'next/image'
import Nav from '../components/Nav'
import Footer from '../components/Footer'

export const metadata: Metadata = {
  title:       'Web Design Services for Florida Small Businesses | Space Coast Marketing',
  description: 'Web design for Florida trades and service businesses. Plumbers, HVAC, roofers, restaurants, dentists, and contractors. Brevard County based.',
  alternates:  { canonical: 'https://spacecoastmarketingagency.com/services' },
}

const FEATURED = {
  emoji: '🔧',
  badge: 'HIGHEST SEARCH VOLUME',
  title: 'Plumbers',
  body: 'Emergency calls don\'t wait — your website can\'t either. We build mobile-first plumbing sites with click-to-call above the fold, service area pages for every city you cover, and the local SEO that wins "plumber near me" searches at 2am.',
  bullets: ['Click-to-call CTA', 'Service area pages', 'Emergency messaging', '24/7 lead capture'],
}

const INDUSTRIES = [
  {
    emoji: '❄️',
    title: 'HVAC',
    body: 'Emergency availability messaging, seasonal service pages, and fast mobile load times — built for the moment a homeowner\'s AC fails at midnight in August.',
  },
  {
    emoji: '🏠',
    title: 'Roofers',
    body: 'Storm damage pages, free inspection CTAs, and license display — built to capture high-ticket jobs before the next contractor calls them back.',
  },
  {
    emoji: '🍽️',
    title: 'Restaurants',
    body: 'HTML menus Google can index, reservation links above the fold, and food photo optimization that fills seats.',
  },
  {
    emoji: '🦷',
    title: 'Dentists',
    body: 'Appointment request forms, insurance acceptance display, and new-patient conversion pages.',
  },
  {
    emoji: '🏗️',
    title: 'Contractors',
    body: 'Project gallery, CGC license display, free estimate CTA — everything a homeowner needs before calling.',
  },
]

function Check() {
  return (
    <svg className="w-4 h-4 text-[#FF4500] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-[#0a0a14] text-[#F5F5F0]">
      <Nav />

      <header className="relative pt-28 pb-14 sm:pt-36 sm:pb-16 text-center px-4 overflow-hidden">
        <Image
          src="/hero/artemis-i-launch.jpg"
          alt="Artemis I rocket ascending from Kennedy Space Center"
          fill className="object-cover"
          style={{ objectPosition: '65% 60%' }}
        />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(10,10,20,0.70) 0%, rgba(10,10,20,0.88) 100%)' }}
          aria-hidden />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="font-mono text-[#FF4500] text-sm tracking-[0.18em] uppercase">// SERVICES</span>
            <span className="h-px bg-[#FF4500]/25 w-12 flex-shrink-0" aria-hidden />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight">
            Web Design for Florida Trades{' '}
            <span className="text-[#FF4500]">&amp; Service Businesses</span>
          </h1>
          <p className="text-white/65 text-lg max-w-xl mx-auto">
            We specialize in the industries that keep Brevard County running. Pick your trade below — or book a free 15-minute call and we&apos;ll handle the rest.
          </p>
        </div>
      </header>

      <section className="pb-20 sm:pb-28 px-4 sm:px-6 lg:px-8" aria-label="Industries we serve">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* Featured — Plumbers */}
          <div className="bg-[#13131f] border border-white/8 rounded-2xl p-7 sm:p-10">
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl" role="img" aria-label="Plumber">{FEATURED.emoji}</span>
                  <span className="font-mono text-[#FF4500] text-[10px] font-bold tracking-[0.22em] uppercase
                    bg-[#FF4500]/10 border border-[#FF4500]/25 px-2.5 py-1 rounded-full">
                    {FEATURED.badge}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">{FEATURED.title}</h2>
                <p className="text-white/65 text-base leading-relaxed mb-6">{FEATURED.body}</p>
                <a href="/#contact"
                  className="inline-flex items-center gap-1.5 text-[#FF4500] font-semibold text-sm hover:text-[#FF6500] transition-colors">
                  See plumber examples →
                </a>
              </div>
              <div className="lg:w-56 flex-shrink-0">
                <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-4">What&apos;s included</p>
                <ul className="space-y-3">
                  {FEATURED.bullets.map(b => (
                    <li key={b} className="flex items-center gap-2.5 text-sm text-white/70">
                      <Check />{b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* 2-column: HVAC + Roofers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {INDUSTRIES.slice(0, 2).map(ind => (
              <div key={ind.title} className="bg-[#13131f] border border-white/8 rounded-2xl p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xl" role="img" aria-label={ind.title}>{ind.emoji}</span>
                  <h2 className="text-lg font-extrabold text-white">{ind.title}</h2>
                </div>
                <p className="text-white/60 text-sm leading-relaxed mb-4">{ind.body}</p>
                <a href="/#contact" className="text-[#FF4500] text-sm font-semibold hover:text-[#FF6500] transition-colors">
                  See examples →
                </a>
              </div>
            ))}
          </div>

          {/* 3-column: Restaurants + Dentists + Contractors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {INDUSTRIES.slice(2).map(ind => (
              <div key={ind.title} className="bg-[#13131f] border border-white/8 rounded-2xl p-6">
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="text-lg" role="img" aria-label={ind.title}>{ind.emoji}</span>
                  <h2 className="text-base font-extrabold text-white">{ind.title}</h2>
                </div>
                <p className="text-white/60 text-sm leading-relaxed mb-4">{ind.body}</p>
                <a href="/#contact" className="text-[#FF4500] text-xs font-semibold hover:text-[#FF6500] transition-colors">
                  See examples →
                </a>
              </div>
            ))}
          </div>

          {/* Not on the list */}
          <div className="bg-[#13131f] border border-[#FF4500]/22 rounded-2xl p-8 sm:p-10 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="h-px bg-[#FF4500]/25 w-10" aria-hidden />
              <span className="font-mono text-[#FF4500] text-xs tracking-[0.18em] uppercase">// NOT ON THE LIST?</span>
              <span className="h-px bg-[#FF4500]/25 w-10" aria-hidden />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white mb-3">
              Don&apos;t see your industry? We still build for you.
            </h2>
            <p className="text-white/55 text-sm leading-relaxed max-w-lg mx-auto mb-7">
              These are our most common verticals. If you run a service business in Brevard County and need a professional website that actually gets you found on Google — we can help.
            </p>
            <a href="https://calendly.com/spacecoastmarketing" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#FF4500] text-white font-bold px-8 py-4 rounded-xl
                hover:bg-[#FF5500] transition-colors text-base min-h-[52px]">
              Book a Free Call
            </a>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  )
}
