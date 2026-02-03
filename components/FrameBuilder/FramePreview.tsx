'use client';

import { useCallback } from 'react';
import { useFrameCanvas } from './useFrameCanvas';
import { LayoutType, getLayoutById, getSlotPixelPositions } from './frameLayouts';
import { StyleType, getStyleById, scaleStyleValues } from './frameStyles';

interface FramePreviewProps {
  images: (string | null)[];
  layout: LayoutType;
  style: StyleType;
  size?: number;
  className?: string;
  onExport?: (blob: Blob) => void;
  onEmptySlotClick?: (slotIndex: number) => void;
}

export default function FramePreview({
  images,
  layout,
  style,
  size = 1024,
  className = '',
  onEmptySlotClick,
}: FramePreviewProps) {
  const { canvasRef, isLoading } = useFrameCanvas({
    images,
    layout,
    style,
    size,
  });

  // Handle click on canvas to detect which slot was clicked
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onEmptySlotClick) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get click position relative to canvas
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Get layout and style to calculate slot positions
    const layoutConfig = getLayoutById(layout);
    const styleConfig = getStyleById(style);
    const scaledStyle = scaleStyleValues(styleConfig, size);

    const canvasWidth = size;
    const canvasHeight = Math.round(size / layoutConfig.aspectRatio);

    const slots = getSlotPixelPositions(
      layoutConfig,
      canvasWidth,
      canvasHeight,
      scaledStyle.padding,
      scaledStyle.gap
    );

    // Check which slot was clicked
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (
        clickX >= slot.x &&
        clickX <= slot.x + slot.width &&
        clickY >= slot.y &&
        clickY <= slot.y + slot.height
      ) {
        // Check if this slot is empty
        if (!images[i]) {
          onEmptySlotClick(i);
        }
        break;
      }
    }
  }, [canvasRef, images, layout, style, size, onEmptySlotClick]);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className={`w-full h-auto rounded-lg ${onEmptySlotClick ? 'cursor-pointer' : ''}`}
        style={{ maxWidth: '100%' }}
        onClick={handleCanvasClick}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-lg">
          <div className="w-8 h-8 border-4 border-coral-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
