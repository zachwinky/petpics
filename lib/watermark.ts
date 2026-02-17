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
  // Font size ~1/5 of width — big and readable
  const fontSize = Math.max(80, Math.floor(width / 5));
  const strokeWidth = Math.max(3, Math.floor(fontSize / 25));

  // Place text in a simple grid that covers the image
  // Using fixed positions rather than computing from diagonal to keep SVG small
  const textElements: string[] = [];
  const stepY = fontSize * 1.5;
  const stepX = fontSize * 5;

  // Generous coverage: go from well outside the image bounds
  for (let y = -height; y < height * 2; y += stepY) {
    for (let x = -width; x < width * 2; x += stepX) {
      // Black outline
      textElements.push(
        `<text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="bold" fill="none" stroke="#000" stroke-opacity="0.6" stroke-width="${strokeWidth}">PETPICS</text>`
      );
      // White fill
      textElements.push(
        `<text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="bold" fill="#fff" fill-opacity="0.8">PETPICS</text>`
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
