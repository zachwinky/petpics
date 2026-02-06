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
 */
function createWatermarkSvg(width: number, height: number): string {
  // Calculate diagonal size (need to cover the whole image when rotated)
  const diagonal = Math.sqrt(width * width + height * height);
  const fontSize = Math.max(24, Math.floor(width / 20)); // Responsive font size
  const spacing = fontSize * 4; // Space between text repetitions

  // Build repeated text elements
  const textElements: string[] = [];
  const rows = Math.ceil(diagonal / spacing) + 2;
  const cols = Math.ceil(diagonal / (fontSize * 8)) + 2;

  for (let row = -1; row < rows; row++) {
    for (let col = -1; col < cols; col++) {
      const x = col * fontSize * 8;
      const y = row * spacing;
      textElements.push(
        `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" fill-opacity="0.35">PETPICS</text>`
      );
    }
  }

  // Create SVG with rotation transform
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <style>
        text { text-shadow: 1px 1px 2px rgba(0,0,0,0.5); }
      </style>
    </defs>
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
