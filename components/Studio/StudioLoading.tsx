'use client';

interface StudioLoadingProps {
  petName: string;
  previewImageUrl?: string;
}

export default function StudioLoading({ petName, previewImageUrl }: StudioLoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      {/* Pet avatar with pulse animation */}
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/20 animate-pulse">
          {previewImageUrl ? (
            <img
              src={previewImageUrl}
              alt={petName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-white/10 flex items-center justify-center">
              <span className="text-3xl">🐾</span>
            </div>
          )}
        </div>
        {/* Orbiting dot animation */}
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-coral-400" />
        </div>
      </div>

      <p className="text-white/90 text-lg font-medium">
        Creating {petName}&apos;s portraits...
      </p>
      <p className="text-white/40 text-sm mt-2">
        This takes about 30–60 seconds
      </p>
    </div>
  );
}
