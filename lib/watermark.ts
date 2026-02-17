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
 * Uses stroke for outline effect since Sharp/librsvg doesn't support text-shadow.
 * Kept simple to avoid SVG rendering failures in librsvg.
 */
function createWatermarkSvg(width: number, height: number): string {
  // Big font — 1/3 of image width so text dominates the image
  const fontSize = Math.max(100, Math.floor(width / 3));
  const strokeWidth = Math.max(4, Math.floor(fontSize / 20));

  const textElements: string[] = [];
  // Tight row spacing — rows overlap slightly
  const stepY = Math.floor(fontSize * 0.9);
  // Columns overlap — "PETPICS" at this size is ~4x fontSize wide
  const stepX = Math.floor(fontSize * 4.5);

  // Cover well beyond bounds for rotation
  for (let y = -height; y < height * 2; y += stepY) {
    for (let x = -width; x < width * 2; x += stepX) {
      // Black outline for contrast on light backgrounds
      textElements.push(
        `<text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="bold" fill="none" stroke="#000" stroke-opacity="0.7" stroke-width="${strokeWidth}">PETPICS</text>`
      );
      // White fill for contrast on dark backgrounds
      textElements.push(
        `<text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="bold" fill="#fff" fill-opacity="0.85">PETPICS</text>`
      );
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <g transform="rotate(-30, ${width / 2}, ${height / 2})">
      ${textElements.join('')}
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
