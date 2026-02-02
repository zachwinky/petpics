'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { LayoutType, getLayoutById, getSlotPixelPositions } from './frameLayouts';
import { StyleType, getStyleById, scaleStyleValues } from './frameStyles';

interface UseFrameCanvasOptions {
  images: (string | null)[];
  layout: LayoutType;
  style: StyleType;
  size?: number; // Canvas size in pixels (default 1024)
}

interface UseFrameCanvasReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isLoading: boolean;
  exportAsBlob: () => Promise<Blob | null>;
  exportAsDataURL: () => string | null;
}

// Load an image and return it as an HTMLImageElement
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Enable CORS for FAL images
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
};

// Draw an image to fit within a slot, cropping to fill (cover mode)
const drawImageCover = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  borderRadius: number = 0
) => {
  const imgRatio = img.width / img.height;
  const slotRatio = width / height;

  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = img.width;
  let sourceHeight = img.height;

  // Crop to fill the slot (cover mode)
  if (imgRatio > slotRatio) {
    // Image is wider - crop sides
    sourceWidth = img.height * slotRatio;
    sourceX = (img.width - sourceWidth) / 2;
  } else {
    // Image is taller - crop top/bottom
    sourceHeight = img.width / slotRatio;
    sourceY = (img.height - sourceHeight) / 2;
  }

  ctx.save();

  // Apply border radius if needed
  if (borderRadius > 0) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, borderRadius);
    ctx.clip();
  }

  ctx.drawImage(
    img,
    sourceX, sourceY, sourceWidth, sourceHeight,
    x, y, width, height
  );

  ctx.restore();
};

// Draw placeholder for empty slot
const drawPlaceholder = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  borderRadius: number = 0,
  slotIndex: number
) => {
  ctx.save();

  // Apply border radius if needed
  if (borderRadius > 0) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, borderRadius);
    ctx.clip();
  }

  // Draw placeholder background
  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(x, y, width, height);

  // Draw plus icon
  const iconSize = Math.min(width, height) * 0.2;
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  ctx.strokeStyle = '#9ca3af';
  ctx.lineWidth = iconSize * 0.15;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(centerX - iconSize / 2, centerY);
  ctx.lineTo(centerX + iconSize / 2, centerY);
  ctx.moveTo(centerX, centerY - iconSize / 2);
  ctx.lineTo(centerX, centerY + iconSize / 2);
  ctx.stroke();

  // Draw slot number
  ctx.fillStyle = '#9ca3af';
  ctx.font = `${iconSize * 0.5}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${slotIndex + 1}`, centerX, centerY + iconSize);

  ctx.restore();
};

export const useFrameCanvas = ({
  images,
  layout,
  style,
  size = 1024,
}: UseFrameCanvasOptions): UseFrameCanvasReturn => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const loadedImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Draw the frame to canvas
  const drawFrame = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsLoading(true);

    try {
      const layoutConfig = getLayoutById(layout);
      const styleConfig = getStyleById(style);
      const scaledStyle = scaleStyleValues(styleConfig, size);

      // Calculate canvas dimensions based on aspect ratio
      const canvasWidth = size;
      const canvasHeight = Math.round(size / layoutConfig.aspectRatio);

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Fill background
      ctx.fillStyle = scaledStyle.backgroundColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Get slot positions
      const slots = getSlotPixelPositions(
        layoutConfig,
        canvasWidth,
        canvasHeight,
        scaledStyle.padding,
        scaledStyle.gap
      );

      // Load all images in parallel
      const imagePromises = images.map(async (url) => {
        if (!url) return null;

        // Check cache first
        if (loadedImagesRef.current.has(url)) {
          return loadedImagesRef.current.get(url)!;
        }

        try {
          const img = await loadImage(url);
          loadedImagesRef.current.set(url, img);
          return img;
        } catch (error) {
          console.error('Failed to load image:', url, error);
          return null;
        }
      });

      const loadedImages = await Promise.all(imagePromises);

      // Draw each slot
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        const img = loadedImages[i];

        // Apply shadow if style has it
        if (scaledStyle.shadowBlur > 0 && img) {
          ctx.save();
          ctx.shadowBlur = scaledStyle.shadowBlur;
          ctx.shadowColor = scaledStyle.shadowColor;
          ctx.shadowOffsetX = scaledStyle.shadowOffsetX;
          ctx.shadowOffsetY = scaledStyle.shadowOffsetY;

          // Draw shadow shape
          ctx.fillStyle = '#ffffff';
          if (scaledStyle.borderRadius > 0) {
            ctx.beginPath();
            ctx.roundRect(slot.x, slot.y, slot.width, slot.height, scaledStyle.borderRadius);
            ctx.fill();
          } else {
            ctx.fillRect(slot.x, slot.y, slot.width, slot.height);
          }
          ctx.restore();
        }

        if (img) {
          drawImageCover(
            ctx,
            img,
            slot.x,
            slot.y,
            slot.width,
            slot.height,
            scaledStyle.borderRadius
          );
        } else {
          drawPlaceholder(
            ctx,
            slot.x,
            slot.y,
            slot.width,
            slot.height,
            scaledStyle.borderRadius,
            i
          );
        }
      }
    } catch (error) {
      console.error('Error drawing frame:', error);
    } finally {
      setIsLoading(false);
    }
  }, [images, layout, style, size]);

  // Redraw when dependencies change
  useEffect(() => {
    drawFrame();
  }, [drawFrame]);

  // Export as Blob
  const exportAsBlob = useCallback(async (): Promise<Blob | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png', 1.0);
    });
  }, []);

  // Export as Data URL
  const exportAsDataURL = useCallback((): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    return canvas.toDataURL('image/png', 1.0);
  }, []);

  return {
    canvasRef,
    isLoading,
    exportAsBlob,
    exportAsDataURL,
  };
};
