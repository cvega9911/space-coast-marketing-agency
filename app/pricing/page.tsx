import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import Nav from '../components/Nav'
import Footer from '../components/Footer'

export const metadata: Metadata = {
  title:       'Pricing — Space Coast Marketing Agency',
  description: 'Transparent pricing for websites and marketing. Website $599 one-time, Growth $599 + $149/mo, Fractional CMO $1,500/mo. No contracts, no surprises.',
  alternates:  { canonical: 'https://spacecoastmarketingagency.com/pricing' },
}

const WEBSITE_FEATURES = [
  '5-page professional website',
  'On-page SEO foundations',
  'SSL included',
  'Google Business Profile setup',
  'Free hosting for life',
  '72-hour preview delivery',
  'Unlimited revisions',
]

const GROWTH_FEATURES = [
  'Everything in Website tier',
  '10-page website, fully optimized',
  'Social Media Management',
  'Google Business Profile Optimization',
  '2 blog posts per month',
  'Review Management',
  'Unlimited revisions',
  'Do-What-We-Said Guarantee',
]

const CMO_FEATURES = [
  'Website included (Tiers 1 + 2, free)',
  '5 custom blog posts per month',
  'Recurring SEO + AEO (ChatGPT, Gemini, Perplexity)',
  'Paid ad management',
  'AI integrations',
  'Marketing automations',
  'Weekly 1-on-1 strategy calls',
  'Monthly reporting',
]

const SITE_CARE_FEATURES = [
  'Hosting + SSL + security updates',
  'Up to 2 content changes/month',
  'Monthly analytics reporting and recommendations',
]

function Check() {
  return (
    <svg className="w-4 h-4 text-[#FF4500] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24"
      stroke="currentColor" strokeWidth={2.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a14] text-[#F5F5F0]">
      <Nav />

      <header className="relative pt-28 pb-14 sm:pt-36 sm:pb-16 text-center px-4 overflow-hidden">
        <Image
          src="/hero/artemis-i-launch.jpg"
          alt="Artemis I rocket at altitude above Kennedy Space Center"
          fill className="object-cover"
          style={{ objectPosition: '65% 35%' }}
        />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(10,10,20,0.70) 0%, rgba(10,10,20,0.88) 100%)' }}
          aria-hidden />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="font-mono text-[#FF4500] text-sm tracking-[0.18em] uppercase">// PRICING</span>
            <span className="h-px bg-[#FF4500]/25 w-12 flex-shrink-0" aria-hidden />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight">
            No contracts. No surprises.{' '}
            <span className="text-[#FF4500]">Just honest pricing.</span>
          </h1>
          <p className="text-white/65 text-lg max-w-xl mx-auto">
            You own your site from day one. See a preview in 72 hours. Pick the plan that fits where you are right now.
          </p>
        </div>
      </header>

      <section className="pb-16 px-4 sm:px-6 lg:px-8" aria-label="Pricing tiers">
        <div className="max-w-5xl mx-auto">

          {/* Military discount */}
          <div className="max-w-5xl mx-auto mb-6">
            <div className="bg-[#13131f] border border-white/7 rounded-2xl px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <svg className="w-5 h-5 text-[#FF4500] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">
                  Military &amp; First Responder: <span className="text-[#FF4500]">$50 off any site build.</span>
                </p>
                <p className="text-white/50 text-xs mt-0.5">Active duty, veterans, police, fire, and EMS. Your word is enough — no verification required.</p>
              </div>
            </div>
          </div>

          {/* 3 tiers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

            {/* Website */}
            <div className="bg-[#13131f] border border-white/8 rounded-2xl p-6 sm:p-8 flex flex-col">
              <p className="text-xs font-mono text-white/55 uppercase tracking-widest mb-4">Website</p>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="font-mono text-4xl font-extrabold text-white">$599</span>
                <span className="text-white/60 text-sm">one-time</span>
              </div>
              <p className="text-white/45 text-xs mb-7">Professional site, built to rank and convert.</p>
              <ul className="space-y-3 flex-1 mb-8">
                {WEBSITE_FEATURES.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white/70"><Check />{f}</li>
                ))}
              </ul>
              <a href="/#contact"
                className="block text-center bg-white/5 border border-white/12 text-white font-bold px-5 py-3 rounded-xl
                  hover:bg-white/10 transition-colors text-sm min-h-[44px] leading-[44px]">
                Get My Website →
              </a>
            </div>

            {/* Growth */}
            <div className="bg-[#13131f] border-2 border-[#FF4500]/45 rounded-2xl p-6 sm:p-8 flex flex-col relative">
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#FF4500] text-white text-[10px] font-extrabold px-4 py-1 rounded-full tracking-widest uppercase shadow-lg shadow-[#FF4500]/30 whitespace-nowrap">
                ⭐ Most Popular
              </span>
              <p className="text-xs font-mono text-white/55 uppercase tracking-widest mb-4 mt-2">Growth</p>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="font-mono text-4xl font-extrabold text-white">$599</span>
                <span className="text-white/60 text-sm">one-time</span>
              </div>
              <p className="text-white/45 text-xs mb-7">+ $149/mo after launch</p>
              <ul className="space-y-3 flex-1 mb-8">
                {GROWTH_FEATURES.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white/70"><Check />{f}</li>
                ))}
              </ul>
              <a href="https://calendly.com/spacecoastmarketing" target="_blank" rel="noopener noreferrer"
                className="block text-center bg-[#FF4500] text-white font-bold px-5 py-3 rounded-xl
                  hover:bg-[#FF5500] transition-colors text-sm min-h-[44px] leading-[44px]">
                Start with Growth →
              </a>
            </div>

            {/* Fractional CMO */}
            <div className="bg-[#13131f] border border-white/8 rounded-2xl p-6 sm:p-8 flex flex-col">
              <p className="text-xs font-mono text-white/55 uppercase tracking-widest mb-4">Fractional CMO</p>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="font-mono text-4xl font-extrabold text-white">$1,500</span>
                <span className="text-white/60 text-sm">/mo</span>
              </div>
              <p className="text-white/65 text-xs italic mb-7 leading-relaxed">
                Your marketing department, on retainer. Website included free.
              </p>
              <ul className="space-y-3 flex-1 mb-8">
                {CMO_FEATURES.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white/70"><Check />{f}</li>
                ))}
              </ul>
              <a href="/#contact"
                className="block text-center bg-white/5 border border-white/12 text-white font-bold px-5 py-3 rounded-xl
                  hover:bg-white/10 transition-colors text-sm min-h-[44px] leading-[44px]">
                Let&apos;s Talk →
              </a>
            </div>
          </div>

          {/* Site Care */}
          <div className="mt-5 bg-[#0f0f1e] border border-white/7 rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2">
                <span className="font-mono text-[#FF4500] text-xs tracking-[0.18em] uppercase font-bold">Site Care Plan</span>
                <span className="font-mono text-white font-extrabold text-lg">$49<span className="text-white/50 font-normal text-xs">/mo</span></span>
                <span className="text-white/45 text-xs">For businesses that already have a website.</span>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                {SITE_CARE_FEATURES.map(f => (
                  <span key={f} className="flex items-center gap-1.5 text-xs text-white/55"><Check />{f}</span>
                ))}
              </div>
            </div>
            <a href="/#contact"
              className="flex-shrink-0 inline-flex items-center gap-1.5 border border-[#FF4500]/35 text-[#FF4500]
                hover:bg-[#FF4500] hover:text-white hover:border-[#FF4500]
                transition-all duration-150 font-bold px-5 py-2.5 rounded-xl text-sm min-h-[44px]">
              Add Site Care →
            </a>
          </div>

          {/* Guarantee */}
          <div className="mt-8 bg-[#13131f] border border-[#FF4500]/22 rounded-2xl p-7 sm:p-9 text-center">
            <p className="text-white/85 text-base sm:text-lg font-semibold leading-relaxed">
              72-hour preview. Full delivery within 14 days. Or you don&apos;t pay.
            </p>
          </div>

          {/* Nonprofit */}
          <div className="mt-5 bg-[#1B2B4B]/40 border border-white/8 rounded-2xl p-6 text-center">
            <p className="text-white/70 text-sm leading-relaxed">
              Own a 501(c)(3)?{' '}
              <span className="text-white font-semibold">We build websites for nonprofits free of charge.</span>
              {' '}Reach out — we&apos;d love to help.
            </p>
          </div>
        </div>
      </section>

      {/* Compare table */}
      <section className="pb-20 sm:pb-24 px-4 sm:px-6 lg:px-8" aria-label="Plan comparison">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-white mb-6 text-center">Plan comparison</h2>
          <div className="overflow-x-auto rounded-2xl border border-white/7">
            <table className="w-full text-sm text-left bg-[#13131f]">
              <thead>
                <tr className="border-b border-white/7">
                  <th className="px-5 py-4 text-white/45 font-mono text-xs uppercase tracking-widest w-1/2">Feature</th>
                  <th className="px-5 py-4 text-white font-bold text-center">Website</th>
                  <th className="px-5 py-4 text-[#FF4500] font-bold text-center">Growth</th>
                  <th className="px-5 py-4 text-white font-bold text-center">CMO</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { f: '5-page website',          w: true,  g: true,  c: true  },
                  { f: '10-page website',          w: false, g: true,  c: true  },
                  { f: 'Google Business Profile',  w: true,  g: true,  c: true  },
                  { f: 'Social Media Management',  w: false, g: true,  c: true  },
                  { f: 'Blog posts (2/mo)',         w: false, g: true,  c: false },
                  { f: 'Blog posts (5/mo)',         w: false, g: false, c: true  },
                  { f: 'Review Management',         w: false, g: true,  c: true  },
                  { f: 'SEO + AEO',                w: false, g: false, c: true  },
                  { f: 'Paid ad management',        w: false, g: false, c: true  },
                  { f: 'AI integrations',           w: false, g: false, c: true  },
                  { f: 'Marketing automations',     w: false, g: false, c: true  },
                  { f: 'Weekly strategy calls',     w: false, g: false, c: true  },
                  { f: 'Monthly reporting',         w: false, g: false, c: true  },
                  { f: '72-hour preview',           w: true,  g: true,  c: true  },
                  { f: 'Unlimited revisions',       w: true,  g: true,  c: true  },
                  { f: 'No contracts',              w: true,  g: true,  c: true  },
                ].map((row, i) => (
                  <tr key={row.f} className={i % 2 === 0 ? 'border-b border-white/5' : 'bg-white/[0.018] border-b border-white/5'}>
                    <td className="px-5 py-3.5 text-white/70">{row.f}</td>
                    {[row.w, row.g, row.c].map((has, j) => (
                      <td key={j} className="px-5 py-3.5 text-center">
                        {has
                          ? <svg className="w-4 h-4 text-[#FF4500] mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-label="Included"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          : <span className="text-white/20 text-base leading-none" aria-label="Not included">—</span>
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="pb-24 text-center px-4">
        <p className="text-white/65 text-base mb-6">Not sure which plan is right for you?</p>
        <a href="/#contact"
          className="inline-flex items-center gap-2 bg-[#FF4500] text-white font-bold px-8 py-4 rounded-xl
            hover:bg-[#FF5500] transition-colors text-base sm:text-lg min-h-[52px]">
          Talk to us — it&apos;s free →
        </a>
      </section>

      <Footer />
    </div>
  )
}
