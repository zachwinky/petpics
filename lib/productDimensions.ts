// Product-type → generation image dimensions
// These aspect ratios match the most common print sizes for each product type.
// The 4x upscaler in lib/print-upscale.ts scales these to print-ready resolution.

export interface ProductGenerationConfig {
  width: number;
  height: number;
  label: string;
}

export const PRODUCT_GENERATION_SIZES: Record<string, ProductGenerationConfig> = {
  canvas:        { width: 1024, height: 1360, label: '3:4 Portrait' },
  framed_poster: { width: 1024, height: 1360, label: '3:4 Portrait' },
  poster:        { width: 1024, height: 1360, label: '3:4 Portrait' },
  mug:           { width: 1024, height: 1024, label: '1:1 Square' },
};

export function getGenerationSize(productType?: string): { width: number; height: number } {
  if (!productType) return { width: 1024, height: 1024 };
  const config = PRODUCT_GENERATION_SIZES[productType];
  return config ? { width: config.width, height: config.height } : { width: 1024, height: 1024 };
}
