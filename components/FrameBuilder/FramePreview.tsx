'use client';

import { useFrameCanvas } from './useFrameCanvas';
import { LayoutType } from './frameLayouts';
import { StyleType } from './frameStyles';

interface FramePreviewProps {
  images: (string | null)[];
  layout: LayoutType;
  style: StyleType;
  size?: number;
  className?: string;
  onExport?: (blob: Blob) => void;
}

export default function FramePreview({
  images,
  layout,
  style,
  size = 1024,
  className = '',
}: FramePreviewProps) {
  const { canvasRef, isLoading } = useFrameCanvas({
    images,
    layout,
    style,
    size,
  });

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-auto rounded-lg"
        style={{ maxWidth: '100%' }}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-lg">
          <div className="w-8 h-8 border-4 border-coral-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
