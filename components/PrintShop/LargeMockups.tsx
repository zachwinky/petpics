'use client';

// Printful product IDs for mockup generation
export const PRINTFUL_PRODUCT_IDS: Record<string, number> = {
  canvas: 3,
  framed_poster: 2,
  poster: 1,
  mug: 19,
};

export function WallBackground({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="w-full rounded-xl p-6 md:p-10 flex items-center justify-center min-h-[280px] md:min-h-[360px]"
      style={{
        background: 'linear-gradient(180deg, #ede7e0 0%, #d6cfc7 60%, #c8bfb7 100%)',
        boxShadow: 'inset 0 0 60px rgba(0,0,0,0.04)',
      }}
    >
      {children}
    </div>
  );
}

export function LargeCanvasMockup({ imageUrl }: { imageUrl: string }) {
  return (
    <WallBackground>
      <div className="max-w-[260px] w-full">
        <div
          className="bg-white p-[6px] relative"
          style={{
            boxShadow: '0 4px 6px rgba(0,0,0,0.1), 0 20px 40px rgba(0,0,0,0.18), inset 0 0 0 1px rgba(0,0,0,0.05)',
          }}
        >
          <img src={imageUrl} alt="Canvas preview" className="w-full aspect-square object-cover block" />
          {/* Gallery wrap depth */}
          <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 3px 3px 0 rgba(0,0,0,0.04), inset -1px -1px 0 rgba(0,0,0,0.02)' }} />
        </div>
      </div>
    </WallBackground>
  );
}

export function LargeFramedMockup({ imageUrl, frameColor }: { imageUrl: string; frameColor: string }) {
  const frameBg = frameColor === 'black' ? '#1a1a1a' : frameColor === 'white' ? '#f5f5f5' : '#d4a574';
  const frameWidth = 'p-2';
  return (
    <WallBackground>
      <div className="max-w-[260px] w-full">
        <div
          className={`${frameWidth} rounded-[2px]`}
          style={{
            backgroundColor: frameBg,
            boxShadow: '0 8px 30px rgba(0,0,0,0.28), 0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          {/* White mat */}
          <div className="bg-white p-3 md:p-4">
            <img src={imageUrl} alt="Framed preview" className="w-full aspect-[3/4] object-cover block" />
          </div>
        </div>
      </div>
    </WallBackground>
  );
}

export function LargePosterMockup({ imageUrl }: { imageUrl: string }) {
  return (
    <WallBackground>
      <div className="max-w-[220px] w-full relative">
        <div
          className="rounded-[2px] overflow-hidden"
          style={{
            boxShadow: '0 4px 20px rgba(0,0,0,0.22), 0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <img src={imageUrl} alt="Poster preview" className="w-full aspect-[3/4] object-cover block" />
        </div>
        {/* Subtle page curl */}
        <div
          className="absolute bottom-0 right-0 w-6 h-6 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.06) 50%)',
            borderRadius: '0 0 2px 0',
          }}
        />
      </div>
    </WallBackground>
  );
}

export function LargeMugMockup({ imageUrl }: { imageUrl: string }) {
  return (
    <div
      className="w-full rounded-xl p-6 md:p-10 flex items-center justify-center min-h-[280px] md:min-h-[360px]"
      style={{ background: 'linear-gradient(180deg, #f0ebe6 0%, #e5ddd5 60%, #ddd4cc 100%)' }}
    >
      <div className="relative">
        {/* Mug body */}
        <div
          className="w-44 h-36 md:w-52 md:h-44 bg-white rounded-b-2xl rounded-t-sm overflow-hidden relative"
          style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.1)' }}
        >
          {/* Image wrap area */}
          <div className="absolute inset-2 md:inset-3 overflow-hidden rounded-sm">
            <img src={imageUrl} alt="Mug preview" className="w-full h-full object-cover" />
          </div>
          {/* Ceramic highlight */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/40 via-transparent to-white/20 pointer-events-none" />
          {/* Rim highlight */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-b from-white/60 to-transparent" />
        </div>
        {/* Handle */}
        <div
          className="absolute -right-4 md:-right-5 top-3 md:top-4 w-5 md:w-6 h-14 md:h-16 border-[3px] md:border-4 border-white rounded-r-full"
          style={{ boxShadow: '2px 2px 6px rgba(0,0,0,0.12)' }}
        />
        {/* Table shadow */}
        <div
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-[110%] h-4 rounded-full opacity-20"
          style={{ background: 'radial-gradient(ellipse, rgba(0,0,0,0.4) 0%, transparent 70%)' }}
        />
      </div>
    </div>
  );
}

/** Renders the correct CSS mockup for a given product type */
export function LargeMockupForType({ productType, imageUrl, frameColor = 'black' }: { productType: string; imageUrl: string; frameColor?: string }) {
  switch (productType) {
    case 'canvas': return <LargeCanvasMockup imageUrl={imageUrl} />;
    case 'framed_poster': return <LargeFramedMockup imageUrl={imageUrl} frameColor={frameColor} />;
    case 'poster': return <LargePosterMockup imageUrl={imageUrl} />;
    case 'mug': return <LargeMugMockup imageUrl={imageUrl} />;
    default: return null;
  }
}
