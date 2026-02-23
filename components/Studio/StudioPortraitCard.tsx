'use client';

interface StudioPortraitCardProps {
  imageUrl: string;
  sceneId?: string;
  createdAt: string;
  onPrint: () => void;
}

export default function StudioPortraitCard({ imageUrl, createdAt, onPrint }: StudioPortraitCardProps) {
  const date = new Date(createdAt);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="group relative rounded-xl overflow-hidden bg-white shadow-sm border border-gray-100">
      <div className="aspect-square">
        <img
          src={imageUrl}
          alt="Studio portrait"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Hover/tap overlay with Print action */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-end">
        <div className="w-full p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
          <button
            onClick={onPrint}
            className="w-full py-2.5 rounded-lg bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors"
          >
            Print This
          </button>
        </div>
      </div>

      {/* Date badge */}
      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm">
        <span className="text-white text-xs">{dateStr}</span>
      </div>
    </div>
  );
}
