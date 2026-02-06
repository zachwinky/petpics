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
 */
function createWatermarkSvg(width: number, height: number): string {
  // Calculate diagonal size (need to cover the whole image when rotated)
  const diagonal = Math.sqrt(width * width + height * height);
  // Bigger font size for more prominent watermark
  const fontSize = Math.max(48, Math.floor(width / 10));
  const spacing = fontSize * 2.5; // Tighter spacing for more coverage

  // Build repeated text elements with stroke outline for visibility
  const textElements: string[] = [];
  const rows = Math.ceil(diagonal / spacing) + 4;
  const cols = Math.ceil(diagonal / (fontSize * 5)) + 4;

  for (let row = -2; row < rows; row++) {
    for (let col = -2; col < cols; col++) {
      const x = col * fontSize * 5;
      const y = row * spacing;
      // Draw stroke first (outline), then fill on top
      textElements.push(
        `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="none" stroke="rgba(0,0,0,0.4)" stroke-width="3">PETPICS</text>`
      );
      textElements.push(
        `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="rgba(255,255,255,0.5)">PETPICS</text>`
      );
    }
  }

  // Create SVG with rotation transform
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <g transform="rotate(-30, ${width / 2}, ${height / 2})">
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
