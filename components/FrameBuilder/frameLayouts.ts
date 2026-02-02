// Frame layout definitions for multi-image collage feature

export type LayoutType = '2x2' | 'featured';

export interface LayoutSlot {
  x: number;      // X position as percentage (0-100)
  y: number;      // Y position as percentage (0-100)
  width: number;  // Width as percentage (0-100)
  height: number; // Height as percentage (0-100)
}

export interface FrameLayout {
  id: LayoutType;
  name: string;
  description: string;
  slots: LayoutSlot[];
  aspectRatio: number; // width / height
}

export const FRAME_LAYOUTS: FrameLayout[] = [
  {
    id: '2x2',
    name: '2x2 Grid',
    description: 'Classic 4-image square grid',
    aspectRatio: 1, // Square
    slots: [
      { x: 0, y: 0, width: 50, height: 50 },     // Top-left
      { x: 50, y: 0, width: 50, height: 50 },    // Top-right
      { x: 0, y: 50, width: 50, height: 50 },    // Bottom-left
      { x: 50, y: 50, width: 50, height: 50 },   // Bottom-right
    ],
  },
  {
    id: 'featured',
    name: '1+3 Featured',
    description: 'One large image with 3 smaller below',
    aspectRatio: 0.8, // Taller than wide (4:5 ratio like Instagram portrait)
    slots: [
      { x: 0, y: 0, width: 100, height: 60 },       // Featured (top, full width)
      { x: 0, y: 60, width: 33.33, height: 40 },    // Bottom-left
      { x: 33.33, y: 60, width: 33.33, height: 40 }, // Bottom-center
      { x: 66.66, y: 60, width: 33.34, height: 40 }, // Bottom-right
    ],
  },
];

export const getLayoutById = (id: LayoutType): FrameLayout => {
  return FRAME_LAYOUTS.find(layout => layout.id === id) || FRAME_LAYOUTS[0];
};

// Calculate actual pixel positions for a given canvas size
export const getSlotPixelPositions = (
  layout: FrameLayout,
  canvasWidth: number,
  canvasHeight: number,
  padding: number = 0,
  gap: number = 0
): { x: number; y: number; width: number; height: number }[] => {
  const effectiveWidth = canvasWidth - (padding * 2);
  const effectiveHeight = canvasHeight - (padding * 2);

  return layout.slots.map((slot, index) => {
    // Calculate base position
    let x = padding + (slot.x / 100) * effectiveWidth;
    let y = padding + (slot.y / 100) * effectiveHeight;
    let width = (slot.width / 100) * effectiveWidth;
    let height = (slot.height / 100) * effectiveHeight;

    // Apply gap (half gap on each side)
    const halfGap = gap / 2;
    x += halfGap;
    y += halfGap;
    width -= gap;
    height -= gap;

    return { x, y, width, height };
  });
};
