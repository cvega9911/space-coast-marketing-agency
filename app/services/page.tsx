import type { Metadata } from 'next'
import Image from 'next/image'
import Nav from '../components/Nav'
import Footer from '../components/Footer'

export const metadata: Metadata = {
  title:       'Services — Space Coast Marketing Agency',
  description: 'Web design, local SEO, social media marketing, and fractional CMO services for Brevard County businesses. Space Coast based.',
  alternates:  { canonical: 'https://spacecoastmarketingagency.com/services' },
}

const SERVICES = [
  {
    tag: '01',
    title: 'Web Design & Development',
    body: "We build fast, mobile-first websites that actually rank on Google. Every site we ship comes with on-page SEO, SSL, Google Business Profile setup, and a 72-hour preview guarantee. You own everything from day one.",
    bullets: [
      'Professional 5–10 page websites',
      'On-page SEO foundations baked in',
      'Google Business Profile optimization',
      'Schema markup for local search',
      '72-hour preview delivery',
      'Unlimited revisions',
    ],
    cta: { label: 'Get My Website — $599', href: '/#contact' },
  },
  {
    tag: '02',
    title: 'Growth Marketing',
    body: "Already have a site? We handle your ongoing visibility — social media, blog content, review management, and Google ranking. You focus on running your business. We keep the phone ringing.",
    bullets: [
      'Social media management',
      'Monthly blog posts (SEO + AEO)',
      'Review management strategy',
      'Google Business Profile management',
      'Monthly analytics reporting',
    ],
    cta: { label: 'See Growth Plan — $149/mo', href: '/pricing' },
  },
  {
    tag: '03',
    title: 'Fractional CMO',
    body: "You don't need a full-time marketing director. You need one that shows up every week with a plan and executes it. We act as your marketing department — strategy, content, ads, automations — for a fraction of the cost.",
    bullets: [
      'Weekly 1-on-1 strategy calls',
      'Paid ad management (Google & Meta)',
      'AI integrations & automations',
      'Full SEO + AEO (AI search visibility)',
      '5 blog posts per month',
      'End-to-end execution — no managing us',
    ],
    cta: { label: "Let's Talk — $1,500/mo", href: '/#contact' },
  },
  {
    tag: '04',
    title: 'Site Care Plan',
    body: "Already have a website built somewhere else? We'll keep it fast, secure, and up to date. Two content changes a month, hosting, SSL, security patches, and a monthly analytics report with actual recommendations.",
    bullets: [
      'Managed hosting + SSL',
      'Security updates and patches',
      'Up to 2 content changes/month',
      'Monthly analytics reporting',
    ],
    cta: { label: 'Add Site Care — $49/mo', href: '/#contact' },
  },
]

function Check() {
  return (
    <svg className="w-4 h-4 text-[#FF4500] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24"
      stroke="currentColor" strokeWidth={2.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-[#0a0a14] text-[#F5F5F0]">
      <Nav />

      {/* Header */}
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
            Everything your business needs to{' '}
            <span className="text-[#FF4500]">get found online.</span>
          </h1>
          <p className="text-white/65 text-lg max-w-xl mx-auto">
            From a first website to full marketing execution — we meet you where you are.
          </p>
        </div>
      </header>

      {/* Service cards */}
      <section className="pb-20 sm:pb-28 px-4 sm:px-6 lg:px-8" aria-label="Our services">
        <div className="max-w-5xl mx-auto space-y-8">
          {SERVICES.map(s => (
            <div key={s.tag} className="bg-[#13131f] border border-white/8 rounded-2xl p-6 sm:p-10">
              <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
                {/* Left */}
                <div className="flex-1">
                  <span className="font-mono text-[#FF4500] text-xs tracking-[0.2em] uppercase mb-3 block">{s.tag}</span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-4 leading-tight">{s.title}</h2>
                  <p className="text-white/65 text-base leading-relaxed mb-6">{s.body}</p>
                  <a href={s.cta.href}
                    className="inline-flex items-center gap-2 bg-[#FF4500] text-white font-bold px-6 py-3 rounded-xl
                      hover:bg-[#FF5500] transition-colors text-sm min-h-[44px]">
                    {s.cta.label} →
                  </a>
                </div>
                {/* Right */}
                <div className="lg:w-64 flex-shrink-0">
                  <p className="text-xs font-mono text-white/35 uppercase tracking-widest mb-4">What&apos;s included</p>
                  <ul className="space-y-3">
                    {s.bullets.map(b => (
                      <li key={b} className="flex items-start gap-2.5 text-sm text-white/70">
                        <Check />{b}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Guarantee */}
      <section className="pb-24 px-4 sm:px-6 lg:px-8" aria-label="Guarantee">
        <div className="max-w-3xl mx-auto bg-[#13131f] border border-[#FF4500]/22 rounded-2xl p-7 sm:p-10 text-center">
          <p className="text-white/85 text-lg font-semibold leading-relaxed mb-4">
            72-hour preview. Full delivery within 14 days. Or you don&apos;t pay.
          </p>
          <a href="/#contact"
            className="inline-flex items-center gap-2 bg-[#FF4500] text-white font-bold px-8 py-3 rounded-xl
              hover:bg-[#FF5500] transition-colors text-sm min-h-[44px]">
            Let&apos;s build something →
          </a>
        </div>
      </section>

      <Footer />
    </div>
  )
}
