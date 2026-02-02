// Frame style definitions for multi-image collage feature

export type StyleType = 'minimal' | 'border' | 'shadow';

export interface FrameStyle {
  id: StyleType;
  name: string;
  description: string;
  padding: number;        // Outer padding in pixels (at 1024px base)
  gap: number;            // Gap between images in pixels (at 1024px base)
  backgroundColor: string;
  borderWidth: number;    // Border around each image
  borderColor: string;
  borderRadius: number;   // Corner radius for images
  shadowBlur: number;     // Shadow blur radius
  shadowColor: string;
  shadowOffsetX: number;
  shadowOffsetY: number;
}

export const FRAME_STYLES: FrameStyle[] = [
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean look with tight spacing',
    padding: 0,
    gap: 4,
    backgroundColor: '#ffffff',
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 0,
    shadowBlur: 0,
    shadowColor: 'transparent',
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  },
  {
    id: 'border',
    name: 'White Border',
    description: 'Classic photo border, print-friendly',
    padding: 24,
    gap: 16,
    backgroundColor: '#ffffff',
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 0,
    shadowBlur: 0,
    shadowColor: 'transparent',
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  },
  {
    id: 'shadow',
    name: 'Shadow',
    description: 'Modern look with subtle shadows',
    padding: 32,
    gap: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 8,
    shadowBlur: 12,
    shadowColor: 'rgba(0, 0, 0, 0.15)',
    shadowOffsetX: 0,
    shadowOffsetY: 4,
  },
];

export const getStyleById = (id: StyleType): FrameStyle => {
  return FRAME_STYLES.find(style => style.id === id) || FRAME_STYLES[0];
};

// Scale style values based on actual canvas size (base is 1024px)
export const scaleStyleValues = (style: FrameStyle, canvasSize: number): FrameStyle => {
  const scale = canvasSize / 1024;
  return {
    ...style,
    padding: Math.round(style.padding * scale),
    gap: Math.round(style.gap * scale),
    borderWidth: Math.round(style.borderWidth * scale),
    borderRadius: Math.round(style.borderRadius * scale),
    shadowBlur: Math.round(style.shadowBlur * scale),
    shadowOffsetX: Math.round(style.shadowOffsetX * scale),
    shadowOffsetY: Math.round(style.shadowOffsetY * scale),
  };
};
