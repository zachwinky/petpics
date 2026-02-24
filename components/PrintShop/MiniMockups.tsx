'use client';

export function MiniCanvasMockup({ imageUrl }: { imageUrl: string }) {
  return (
    <div className="w-16 h-16 mx-auto mb-2">
      <div className="w-full h-full bg-white p-[3px] shadow-md" style={{ boxShadow: '2px 3px 8px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(0,0,0,0.05)' }}>
        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
      </div>
    </div>
  );
}

export function MiniFramedMockup({ imageUrl }: { imageUrl: string }) {
  return (
    <div className="w-16 h-16 mx-auto mb-2 flex items-center justify-center">
      <div className="w-14 h-[4.5rem] bg-gray-900 p-[3px] shadow-md" style={{ boxShadow: '2px 3px 8px rgba(0,0,0,0.3)' }}>
        <div className="w-full h-full bg-white p-[3px]">
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      </div>
    </div>
  );
}

export function MiniPosterMockup({ imageUrl }: { imageUrl: string }) {
  return (
    <div className="w-16 h-16 mx-auto mb-2 flex items-center justify-center">
      <div className="w-12 h-16 shadow-md rounded-[1px] overflow-hidden" style={{ boxShadow: '2px 3px 8px rgba(0,0,0,0.25)' }}>
        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
      </div>
    </div>
  );
}

export function MiniMugMockup({ imageUrl }: { imageUrl: string }) {
  return (
    <div className="w-16 h-16 mx-auto mb-2 flex items-center justify-center">
      <div className="relative">
        {/* Mug body */}
        <div className="w-12 h-10 bg-white rounded-b-lg overflow-hidden relative" style={{ boxShadow: '2px 2px 6px rgba(0,0,0,0.2)' }}>
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          {/* Ceramic highlight */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-transparent to-transparent pointer-events-none" />
        </div>
        {/* Handle */}
        <div className="absolute -right-2 top-1 w-3 h-6 border-2 border-white/80 rounded-r-full" />
      </div>
    </div>
  );
}

export const MINI_MOCKUPS: Record<string, React.ComponentType<{ imageUrl: string }>> = {
  canvas: MiniCanvasMockup,
  framed_poster: MiniFramedMockup,
  poster: MiniPosterMockup,
  mug: MiniMugMockup,
};
