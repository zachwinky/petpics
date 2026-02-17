import sharp from 'sharp';

/**
 * Add a diagonal watermark pattern to an image.
 * The watermark consists of "PETPICS" text repeated diagonally across the image.
 */
export async function addWatermark(imageUrl: string): Promise<Buffer> {
  // Fetch the original image
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());

  // Get image dimensions
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 1024;
  const height = metadata.height || 1024;

  // Create SVG watermark overlay with diagonal repeating pattern
  const watermarkSvg = createWatermarkSvg(width, height);

  // Composite the watermark onto the image
  const watermarkedImage = await sharp(imageBuffer)
    .composite([
      {
        input: Buffer.from(watermarkSvg),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer();

  return watermarkedImage;
}

/**
 * Create SVG watermark with diagonal "PETPICS" text pattern.
 * Uses stroke for outline effect since Sharp doesn't support text-shadow.
 * Designed to be clearly visible and unremovable on any image.
 */
function createWatermarkSvg(width: number, height: number): string {
  const diagonal = Math.sqrt(width * width + height * height);
  // Large font — roughly 1/4 of image width
  const fontSize = Math.max(100, Math.floor(width / 4));
  // Tight row spacing so text overlaps the image densely
  const rowSpacing = fontSize * 1.2;
  // Horizontal gap between repeated words
  const colSpacing = fontSize * 3.5;
  const strokeWidth = Math.max(6, fontSize / 12);

  const textElements: string[] = [];
  const rows = Math.ceil(diagonal / rowSpacing) + 6;
  const cols = Math.ceil(diagonal / colSpacing) + 6;

  for (let row = -3; row < rows; row++) {
    for (let col = -3; col < cols; col++) {
      const x = col * colSpacing;
      const y = row * rowSpacing;
      // Black stroke outline for readability on light areas
      textElements.push(
        `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="900" fill="none" stroke="rgba(0,0,0,0.7)" stroke-width="${strokeWidth}" letter-spacing="8">PETPICS</text>`
      );
      // White fill for readability on dark areas
      textElements.push(
        `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="900" fill="rgba(255,255,255,0.85)" letter-spacing="8">PETPICS</text>`
      );
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <g transform="rotate(-35, ${width / 2}, ${height / 2})">
      ${textElements.join('\n      ')}
    </g>
  </svg>`;
}

/**
 * Upload a watermarked image buffer to FAL storage and return the URL.
 */
export async function uploadWatermarkedImage(buffer: Buffer): Promise<string> {
  const { fal } = await import('@fal-ai/client');

  // Configure FAL with credentials
  const apiKey = process.env.FAL_KEY;
  if (!apiKey) {
    throw new Error('FAL_KEY not configured');
  }
  fal.config({ credentials: apiKey });

  // Convert Buffer to Uint8Array for Blob compatibility
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
