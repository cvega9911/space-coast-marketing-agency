import type { Metadata } from 'next'
import Image from 'next/image'
import Nav from '../components/Nav'
import Footer from '../components/Footer'

export const metadata: Metadata = {
  title:       'Blog — Space Coast Marketing Agency',
  description: 'Marketing tips, web design guides, and local SEO advice for Brevard County businesses.',
  alternates:  { canonical: 'https://spacecoastmarketingagency.com/blog' },
}

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-[#0a0a14] text-[#F5F5F0]">
      <Nav />

      <header className="relative pt-28 pb-14 sm:pt-36 sm:pb-16 text-center px-4 overflow-hidden">
        <Image
          src="/hero/artemis-i-launch.jpg"
          alt="Artemis I rocket high above Kennedy Space Center"
          fill className="object-cover"
          style={{ objectPosition: '65% 12%' }}
        />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(10,10,20,0.70) 0%, rgba(10,10,20,0.88) 100%)' }}
          aria-hidden />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="font-mono text-[#FF4500] text-sm tracking-[0.18em] uppercase">// BLOG</span>
            <span className="h-px bg-[#FF4500]/25 w-12 flex-shrink-0" aria-hidden />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">
            Local marketing, straight talk.
          </h1>
          <p className="text-white/65 text-lg max-w-lg mx-auto">
            No fluff. Practical tips for Brevard County business owners who want to get found online.
          </p>
        </div>
      </header>

      <section className="pb-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-[#13131f] border border-white/8 rounded-2xl p-10 sm:p-14 text-center">
            <div className="text-5xl mb-4" aria-hidden>🚀</div>
            <h2 className="text-xl font-bold text-white mb-2">Posts coming soon.</h2>
            <p className="text-white/55 text-base max-w-md mx-auto mb-7">
              We&apos;re working on actionable guides for Space Coast business owners. Check back soon — or follow us on social to get notified first.
            </p>
            <a href="/#contact"
              className="inline-flex items-center gap-2 bg-[#FF4500] text-white font-bold px-6 py-3 rounded-xl
                hover:bg-[#FF5500] transition-colors text-sm min-h-[44px]">
              Have a question? Ask us →
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
