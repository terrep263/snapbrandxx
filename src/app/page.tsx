'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function LandingPage() {
  const gumroadUrl = process.env.NEXT_PUBLIC_GUMROAD_PRODUCT_URL || 'https://snapworxxbrand.gumroad.com/l/snapbrandxx';

  return (
    <div className="min-h-screen bg-white">
      {/* Header - Fixed */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10">
              <Image
                src="/logo.png"
                alt="SnapBrandXX Logo"
                width={40}
                height={40}
                className="object-contain"
                unoptimized
              />
            </div>
            <span className="text-xl font-mono font-bold text-dark">SnapBrandXX</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Log In
            </Link>
            <a
              href={gumroadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-medium text-white bg-brand-red hover:bg-brand-red-dark rounded-lg transition-colors"
            >
              Buy on Gumroad
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-24 md:pt-40 md:pb-32 min-h-screen flex items-center relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-gradient-radial from-brand-red-light/30 via-transparent to-transparent blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="max-w-3xl mx-auto text-center">
            <div className="mb-8 flex justify-center">
              <div className="relative w-[120px] h-[120px] animate-float">
                <Image
                  src="/logo.png"
                  alt="SnapBrandXX Logo"
                  width={120}
                  height={120}
                  className="object-contain"
                  unoptimized
                />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-mono font-bold text-dark mb-6 leading-tight animate-fade-in-up">
              Brand every image{' '}
              <span className="text-brand-red">once — perfectly — at scale</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              Upload dozens or hundreds of images. Place your watermark once with exact positioning. 
              Export everything with consistent branding across every image.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <a
                href={gumroadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 text-base font-medium text-white bg-brand-red hover:bg-brand-red-dark rounded-lg transition-colors shadow-lg"
              >
                Buy Once on Gumroad
              </a>
              <Link
                href="/login"
                className="px-8 py-4 text-base font-medium text-gray-700 bg-white border-2 border-gray-300 hover:border-gray-400 rounded-lg transition-colors"
              >
                Log In
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5 text-brand-red" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                No subscription
              </span>
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5 text-brand-red" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Web-based
              </span>
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5 text-brand-red" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Lifetime access
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <section className="bg-white border-y border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              'One-time purchase',
              'No watermark on exports',
              'Exact positioning, not guesswork',
              'Your designs stay consistent on every image',
            ].map((item, index) => (
              <div key={index} className="flex items-start gap-3">
                <svg className="w-6 h-6 text-brand-red flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What Makes Different Section */}
      <section className="py-24 md:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-mono font-bold text-dark mb-6">
                What Makes Different
              </h2>
              <p className="text-lg text-gray-600 mb-4">
                Most watermark tools force you to place your brand on every image individually. 
                SnapBrandXX is built for bulk workflows from the ground up.
              </p>
              <p className="text-lg text-gray-600 mb-4">
                Design your watermark once with normalized coordinates. When you apply it to images 
                of different sizes or aspect ratios, it maintains the same visual position and scale. 
                No more guessing where your logo will end up.
              </p>
              <p className="text-lg text-gray-600">
                This is a tool for professionals who need consistency, not a playground for one-off edits.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square bg-gray-100 rounded-lg relative overflow-hidden">
                  <div className="absolute top-2 right-2 w-3 h-3 bg-brand-red rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 md:py-32 bg-dark text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">Process</span>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                number: '1',
                title: 'Upload Your Images',
                description: 'Drag and drop or select multiple images. SnapBrandXX handles JPG, PNG, and WebP formats.',
              },
              {
                number: '2',
                title: 'Place Your Brand Once',
                description: 'Design your watermark with exact positioning. Use text, logos, or both. Position once, apply everywhere.',
              },
              {
                number: '3',
                title: 'Export Everything',
                description: 'Download individual images or a ZIP file. All exports maintain your exact watermark positioning.',
              },
            ].map((step, index) => (
              <div
                key={index}
                className="bg-gray-900 rounded-lg p-8 hover:bg-gray-800 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="text-6xl font-mono font-bold text-brand-red mb-4">{step.number}</div>
                <h3 className="text-xl font-mono font-bold mb-3">{step.title}</h3>
                <p className="text-gray-400">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Built For Real Workflows Section */}
      <section className="py-24 md:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Use Cases</span>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                ),
                title: 'Creators',
                description: 'Brand your portfolio images, social media content, and client deliverables with consistent positioning.',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                ),
                title: 'Real Estate',
                description: 'Watermark property photos for listings. Maintain brand consistency across hundreds of images.',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                ),
                title: 'Media & Marketing',
                description: 'Brand campaign images, press releases, and marketing materials at scale.',
              },
            ].map((useCase, index) => (
              <div
                key={index}
                className="border-2 border-gray-200 rounded-lg p-8 hover:border-brand-red hover:shadow-lg transition-all duration-300"
              >
                <div className="text-brand-red mb-4">{useCase.icon}</div>
                <h3 className="text-xl font-mono font-bold text-dark mb-3">{useCase.title}</h3>
                <p className="text-gray-600">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Professionals Use Section */}
      <section className="py-24 md:py-32 bg-gradient-to-b from-off-white to-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-mono font-bold text-dark mb-8">
                Why Professionals Use SnapBrandXX
              </h2>
              <div className="space-y-4">
                {[
                  'Normalized coordinates ensure consistent positioning across any image size',
                  'Bulk export processes dozens of images without freezing your browser',
                  'No watermarks on your exports — you own the final images',
                  'Design once, apply everywhere — saves hours on repetitive work',
                  'Web-based — no installation, works on any device',
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-brand-red flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-lg p-8 shadow-lg border border-gray-200">
              <p className="text-lg text-gray-700 italic">
                "This is a tool, not a playground. Built for professionals who need consistency 
                and reliability, not one-off experiments."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Access Model Section */}
      <section className="py-24 md:py-32 bg-brand-red-light">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-white rounded-lg p-8 md:p-12 shadow-xl text-center">
            <h2 className="text-3xl md:text-4xl font-mono font-bold text-dark mb-4">
              One-time purchase. Buy once. Use forever.
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              No subscriptions, no monthly fees, no usage limits. Purchase once and get lifetime access 
              to all features and updates.
            </p>
            <a
              href={gumroadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-4 text-base font-medium text-white bg-brand-red hover:bg-brand-red-dark rounded-lg transition-colors shadow-lg"
            >
              Buy on Gumroad
            </a>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 md:py-32 bg-dark text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-mono font-bold mb-8">
            Ready to brand faster — without fighting your tools?
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={gumroadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 text-base font-medium text-white bg-brand-red hover:bg-brand-red-dark rounded-lg transition-colors shadow-lg"
            >
              Buy Once on Gumroad
            </a>
            <Link
              href="/login"
              className="px-8 py-4 text-base font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 border-2 border-gray-700 rounded-lg transition-colors"
            >
              Log In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#111] text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 items-center">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="relative w-8 h-8">
                  <Image
                    src="/logo.png"
                    alt="SnapBrandXX Logo"
                    width={32}
                    height={32}
                    className="object-contain"
                    unoptimized
                  />
                </div>
                <span className="text-lg font-mono font-bold text-white">SnapBrandXX</span>
              </div>
              <p className="text-sm">Professional bulk watermarking</p>
            </div>
            <div className="flex justify-center gap-6">
              <a href="#" className="text-sm hover:text-white transition-colors">Privacy</a>
              <a href="#" className="text-sm hover:text-white transition-colors">Terms</a>
              <a href="#" className="text-sm hover:text-white transition-colors">Contact</a>
            </div>
            <div className="text-sm text-right">
              © {new Date().getFullYear()} SnapBrandXX. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
