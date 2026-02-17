import sharp from 'sharp';

/**
 * Pre-rendered "PETPICS" watermark tile (484x95 PNG, white text with dark outline).
 * Embedded as base64 so it works on any environment without requiring fonts.
 * Generated locally with Sharp's Pango text engine at 120pt bold Sans.
 */
const WATERMARK_TILE_BASE64 =
  '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';

// Tile dimensions (must match the embedded PNG)
const TILE_WIDTH = 484;
const TILE_HEIGHT = 95;

/**
 * Add a diagonal watermark pattern to an image.
 * Uses a pre-rendered PNG tile to avoid any font-rendering issues on serverless.
 */
export async function addWatermark(imageUrl: string): Promise<Buffer> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 1024;
  const height = metadata.height || 1024;

  const watermarkOverlay = await createWatermarkOverlay(width, height);

  return sharp(imageBuffer)
    .composite([{ input: watermarkOverlay, top: 0, left: 0 }])
    .png()
    .toBuffer();
}

/**
 * Create watermark overlay by scaling, tiling, and rotating the embedded tile.
 * No fonts or text rendering needed — works identically on any environment.
 */
async function createWatermarkOverlay(width: number, height: number): Promise<Buffer> {
  const tileBuf = Buffer.from(WATERMARK_TILE_BASE64, 'base64');

  // Scale tile so it's ~45% of image width
  const targetWidth = Math.max(200, Math.floor(width * 0.45));
  const scale = targetWidth / TILE_WIDTH;
  const scaledW = Math.floor(TILE_WIDTH * scale);
  const scaledH = Math.floor(TILE_HEIGHT * scale);

  // Scale and make semi-transparent (60% opacity)
  const scaledTile = await sharp(tileBuf)
    .resize(scaledW, scaledH)
    .ensureAlpha()
    .linear([1, 1, 1, 0.6], [0, 0, 0, 0])
    .png()
    .toBuffer();

  // Tile across a canvas large enough to survive rotation
  const gapX = Math.floor(scaledW * 0.3);
  const gapY = Math.floor(scaledH * 1.0);
  const diagSize = Math.ceil(Math.sqrt(width * width + height * height));
  const patternW = diagSize * 2;
  const patternH = diagSize * 2;

  const composites: { input: Buffer; top: number; left: number }[] = [];
  for (let y = 0; y < patternH; y += scaledH + gapY) {
    const row = Math.floor(y / (scaledH + gapY));
    const offsetX = row % 2 === 1 ? Math.floor((scaledW + gapX) / 2) : 0;
    for (let x = 0; x < patternW; x += scaledW + gapX) {
      const left = x + offsetX;
      if (left + scaledW <= patternW && y + scaledH <= patternH) {
        composites.push({ input: scaledTile, top: y, left });
      }
    }
  }

  // Create pattern canvas, rotate -30°, crop to image dimensions
  const rotated = await sharp({
    create: { width: patternW, height: patternH, channels: 4 as const, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(composites)
    .rotate(-30, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const rotMeta = await sharp(rotated).metadata();
  const extractLeft = Math.floor((rotMeta.width! - width) / 2);
  const extractTop = Math.floor((rotMeta.height! - height) / 2);

  return sharp(rotated)
    .extract({ left: extractLeft, top: extractTop, width, height })
    .png()
    .toBuffer();
}

/**
 * Upload a watermarked image buffer to FAL storage and return the URL.
 */
export async function uploadWatermarkedImage(buffer: Buffer): Promise<string> {
  const { fal } = await import('@fal-ai/client');

  const apiKey = process.env.FAL_KEY;
  if (!apiKey) {
    throw new Error('FAL_KEY not configured');
  }
  fal.config({ credentials: apiKey });

  const uint8Array = new Uint8Array(buffer);
  const blob = new Blob([uint8Array], { type: 'image/png' });
  const url = await fal.storage.upload(blob);
  return url;
}

/**
 * Convenience function: watermark an image and upload it, returning the final URL.
 */
export async function watermarkAndUpload(imageUrl: string): Promise<string> {
  const watermarkedBuffer = await addWatermark(imageUrl);
  const uploadedUrl = await uploadWatermarkedImage(watermarkedBuffer);
  return uploadedUrl;
}
