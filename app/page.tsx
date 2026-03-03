'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface ProductInfo {
  product_type: string;
  price_cents: number;
}

interface ProductPricing {
  canvas: string;
  poster: string;
  mug: string;
}

const FALLBACK_PRICES: ProductPricing = {
  canvas: '$34.99',
  poster: '$24.99',
  mug: '$24.99',
};

const FAQ_ITEMS = [
  {
    q: 'What kind of photos work best?',
    a: 'Clear, well-lit photos where your pet\'s face and features are visible. We recommend a mix of close-ups and full body shots. 5-10 photos gives the AI the best results — variety in angles and backgrounds helps a lot.',
  },
  {
    q: 'How long does the whole process take?',
    a: 'The AI generates your portrait in minutes. Once you approve the design, printing and shipping typically takes 5-10 business days depending on your location.',
  },
  {
    q: 'What if I don\'t like the result?',
    a: 'You\'ll preview your AI portrait before anything gets printed. You can regenerate with different styles until you love it. We don\'t print until you approve.',
  },
  {
    q: 'Can I use this for a pet that\'s passed away?',
    a: 'Absolutely. Many of our customers create memorial portraits of beloved pets. As long as you have a few clear photos, our AI can create a beautiful tribute.',
  },
  {
    q: 'Do you ship internationally?',
    a: 'Yes! We ship worldwide through our fulfillment partner. Shipping times vary by location, but most international orders arrive within 10-15 business days.',
  },
  {
    q: 'What pets do you support?',
    a: 'Dogs, cats, birds, rabbits, reptiles — if you\'ve got photos, we can make art. Our AI works best with dogs and cats, but we\'ve had great results with all kinds of animals.',
  },
];

const REVIEWS = [
  {
    text: '"I ordered a canvas of my golden retriever and it looks AMAZING hanging above my couch. The AI captured his goofy smile perfectly."',
    author: 'Jessica M.',
    pet: "Buddy's mom",
  },
  {
    text: '"Gave my sister a mug with her cat on it for Christmas. She literally cried. Best gift I\'ve ever given, hands down."',
    author: 'Marcus T.',
    pet: 'Uncle to Whiskers',
  },
  {
    text: '"The quality of the print blew me away. I\'ve ordered from other pet portrait sites and nothing comes close. Already ordering another for my office."',
    author: 'Sarah K.',
    pet: "Luna's human",
  },
];

const GIFT_USECASES = ['Birthdays', 'Holidays', 'Pet Memorials', 'New Pet Parents', 'Just Because'];

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const ArrowIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M5 12h14m-7-7 7 7-7 7" />
  </svg>
);

// Hardcoded product mockup images — served from /public, loads instantly
const PRODUCT_IMAGES: Record<string, string> = {
  canvas: '/products/canvas-mockup.png',
  poster: '/products/poster-mockup.png',
  mug: '/products/mug-mockup.png',
};

// Hero lifestyle images (people holding products)
const HERO_IMAGES: Record<string, string> = {
  canvas: '/products/hero-canvas.png',
  poster: '/products/hero-poster.png',
  mug: '/products/hero-mug.png',
};

export default function Home() {
  const router = useRouter();
  const { data: session } = useSession();
  const [prices, setPrices] = useState<ProductPricing>(FALLBACK_PRICES);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Fetch real product prices
  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch('/api/print/products');
        if (!res.ok) return;
        const data = await res.json();
        const products: ProductInfo[] = data.products || [];

        // Find minimum price per product type
        const minByType: Record<string, number> = {};
        for (const p of products) {
          const type = p.product_type;
          if (!minByType[type] || p.price_cents < minByType[type]) {
            minByType[type] = p.price_cents;
          }
        }

        const format = (cents: number) => {
          const dollars = cents / 100;
          return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
        };

        setPrices({
          canvas: minByType['canvas'] ? format(minByType['canvas']) : FALLBACK_PRICES.canvas,
          poster: minByType['poster'] ? format(minByType['poster']) : FALLBACK_PRICES.poster,
          mug: minByType['mug'] ? format(minByType['mug']) : FALLBACK_PRICES.mug,
        });
      } catch {
        // Use fallback prices
      }
    }
    fetchPrices();
  }, []);

  const handleCreateYours = (productType: string) => {
    // Store selected product in localStorage so it survives auth redirect
    localStorage.setItem('selectedProduct', productType);
    router.push('/dashboard?product=' + productType);
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="landing">
      {/* NAV */}
      <nav className="landing-nav">
        <a href="/" className="landing-nav-logo">
          <span className="landing-nav-shark">🦈</span> petpics
        </a>
        <div className="landing-nav-links">
          <a href="#products" className="landing-nav-link-desktop" onClick={(e) => { e.preventDefault(); scrollTo('products'); }}>Shop</a>
          <a href="#how" className="landing-nav-link-desktop" onClick={(e) => { e.preventDefault(); scrollTo('how'); }}>How It Works</a>
          <a href="#faq" className="landing-nav-link-desktop" onClick={(e) => { e.preventDefault(); scrollTo('faq'); }}>FAQ</a>
          {session ? (
            <a href="/dashboard" className="landing-nav-signin">Dashboard</a>
          ) : (
            <a href="/auth/signin" className="landing-nav-signin">Sign In</a>
          )}
          <a href="#products" className="landing-nav-cta" onClick={(e) => { e.preventDefault(); scrollTo('products'); }}>Get Started</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="landing-hero">
        <div className="landing-hero-text">
          <h1>Your pet deserves to be a <em>masterpiece</em></h1>
          <p>AI-powered pet portraits printed on museum-quality canvas, posters, and mugs. Upload a few photos, pick your style — we&apos;ll handle the rest.</p>
          <div className="landing-hero-badges">
            <div className="landing-hero-badge">
              <CheckIcon />
              AI-generated in minutes
            </div>
            <div className="landing-hero-badge">
              <CheckIcon />
              Premium print quality
            </div>
            <div className="landing-hero-badge">
              <CheckIcon />
              Ships to your door
            </div>
          </div>
          <div className="landing-hero-cta-group">
            <button className="landing-btn-primary" onClick={() => scrollTo('products')}>
              Shop Products
              <ArrowIcon />
            </button>
            <button className="landing-btn-secondary" onClick={() => scrollTo('how')}>See How It Works</button>
          </div>
        </div>
        <div className="landing-hero-visual">
          {[
            { type: 'canvas', label: 'Canvas Print' },
            { type: 'mug', label: 'Ceramic Mug' },
            { type: 'poster', label: 'Poster Print' },
          ].map(({ type, label }) => (
            <div key={type} className="landing-hero-product" onClick={() => handleCreateYours(type)}>
              <img src={HERO_IMAGES[type]} alt={label} className="landing-hero-product-img" />
            </div>
          ))}
        </div>
        <div className="landing-hero-scroll-hint">← swipe to see products →</div>
      </section>

      {/* PRODUCTS */}
      <section className="landing-products-section" id="products">
        <div className="section-header">
          <div className="section-tag">Choose Your Product</div>
          <h2>Pick how you want to show off your best friend</h2>
          <p>Every product features your pet transformed into stunning AI art, printed with vibrant, fade-resistant inks.</p>
        </div>
        <div className="landing-products-grid">
          {[
            { type: 'canvas' as const, name: 'Canvas Print', desc: 'Gallery-wrapped on a solid wood frame. Arrives ready to hang — no framing needed.', popular: true },
            { type: 'poster' as const, name: 'Poster Print', desc: 'Vibrant matte finish on heavyweight paper. Perfect for framing your way.', popular: false },
            { type: 'mug' as const, name: 'Ceramic Mug', desc: 'Start every morning with your best friend. Dishwasher-safe, 11oz white ceramic.', popular: false },
          ].map(({ type, name, desc, popular }) => (
            <div key={type} className="landing-product-card" onClick={() => handleCreateYours(type)}>
              <div className="landing-product-card-image">
                {popular && <div className="landing-product-popular">Most Popular</div>}
                <img src={PRODUCT_IMAGES[type]} alt={name} className="landing-product-card-photo" />
              </div>
              <div className="landing-product-card-body">
                <h3>{name}</h3>
                <p>{desc}</p>
                <div className="landing-product-card-footer">
                  <div className="landing-product-price">From {prices[type]} <span>+ shipping</span></div>
                  <button className="landing-product-card-btn" onClick={(e) => { e.stopPropagation(); handleCreateYours(type); }}>Create Yours</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-6">
          <a href="/print/upload" className="text-sm text-[var(--lp-soft-brown)] underline opacity-70 hover:opacity-100 transition-opacity">
            Already have a photo you love? Print it directly &rarr;
          </a>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="landing-how-section" id="how">
        <div className="section-header">
          <div className="section-tag">How It Works</div>
          <h2>Three steps to a masterpiece</h2>
          <p>From photo to front door in minutes (well, plus shipping).</p>
        </div>
        <div className="landing-steps-grid">
          <div className="landing-step">
            <div className="landing-step-connector-vertical"></div>
            <div className="landing-step-number">1</div>
            <div className="landing-step-connector"></div>
            <h3>Pick your product</h3>
            <p>Canvas, poster, or mug — choose the format that fits your style (or their gift).</p>
          </div>
          <div className="landing-step">
            <div className="landing-step-connector-vertical"></div>
            <div className="landing-step-number">2</div>
            <div className="landing-step-connector"></div>
            <h3>Upload pet photos</h3>
            <p>A few good shots of your furry friend is all we need. Our AI does the rest.</p>
          </div>
          <div className="landing-step">
            <div className="landing-step-connector-vertical"></div>
            <div className="landing-step-number">3</div>
            <h3>We print &amp; ship</h3>
            <p>Preview your AI portrait, approve the design, and we&apos;ll deliver it to your door.</p>
          </div>
        </div>
      </section>

      {/* GIFT SECTION */}
      <section className="landing-gift-section">
        <div className="section-tag">The Perfect Gift</div>
        <h2>They won&apos;t stop talking about <em>this one</em></h2>
        <p>Surprise the pet parent in your life with a custom portrait of their best friend. No guessing sizes, no generic gift cards.</p>
        <div className="landing-gift-usecases">
          {GIFT_USECASES.map((use) => (
            <div key={use} className="landing-gift-use">
              <div className="landing-gift-use-dot"></div>
              {use}
            </div>
          ))}
        </div>
        <button className="landing-btn-primary" onClick={() => scrollTo('products')}>
          Shop Gift-Worthy Portraits
          <ArrowIcon />
        </button>
      </section>

      {/* REVIEWS */}
      <section className="landing-reviews-section">
        <div className="section-header">
          <div className="section-tag">Happy Pet Parents</div>
          <h2>See why they&apos;re obsessed</h2>
        </div>
        <div className="landing-reviews-grid">
          {REVIEWS.map((review, i) => (
            <div key={i} className="landing-review-card">
              <div className="landing-review-stars">★★★★★</div>
              <div className="landing-review-text">{review.text}</div>
              <div className="landing-review-author">
                {review.author} <span className="landing-review-pet">— {review.pet}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="landing-faq-section" id="faq">
        <div className="section-header">
          <div className="section-tag">FAQ</div>
          <h2>Questions? We&apos;ve got answers</h2>
        </div>
        <div className="landing-faq-list">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="landing-faq-item">
              <button
                className={`landing-faq-q${openFaq === i ? ' open' : ''}`}
                onClick={() => toggleFaq(i)}
              >
                {item.q}
              </button>
              <div className={`landing-faq-a${openFaq === i ? ' open' : ''}`}>
                <p>{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="landing-final-cta">
        <h2>Ready to turn your pet into <em>art</em>?</h2>
        <p>Pick a product, upload a few photos, and let our AI do the heavy lifting. Your walls (and mornings) will thank you.</p>
        <button className="landing-btn-primary" onClick={() => scrollTo('products')}>
          Get Started
          <ArrowIcon />
        </button>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="landing-footer-logo">
          <span className="landing-nav-shark">🦈</span> petpics
        </div>
        <div className="landing-footer-links">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="mailto:support@akoolai.com">Support</a>
          <a href="mailto:support@akoolai.com">Contact</a>
        </div>
        <div>© 2026 Dyneeoh LLC. All rights reserved.</div>
      </footer>
    </div>
  );
}
