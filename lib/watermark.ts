import sharp from 'sharp';

/**
 * Add a watermark pattern to an image.
 * Uses inline SVG text rendering — no external fonts, no embedded PNGs.
 */
export async function addWatermark(imageUrl: string): Promise<Buffer> {
  console.log(`[watermark] Starting for: ${imageUrl.substring(0, 80)}...`);

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 1024;
  const height = metadata.height || 1024;
  console.log(`[watermark] Image: ${width}x${height}`);

  const overlay = await createWatermarkOverlay(width, height);
  console.log(`[watermark] Overlay created (${overlay.length} bytes), compositing...`);

  const result = await sharp(imageBuffer)
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png()
    .toBuffer();

  console.log(`[watermark] Done, output: ${result.length} bytes`);
  return result;
}

/**
 * Create watermark overlay using pure SVG text.
 * Uses only basic SVG features that work with any librsvg version.
 * Renders "PETPICS" in a staggered grid pattern with white fill + dark stroke.
 */
async function createWatermarkOverlay(width: number, height: number): Promise<Buffer> {
  const fontSize = Math.max(40, Math.floor(width / 6));
  const rowHeight = Math.floor(fontSize * 1.8);
  const colWidth = Math.floor(fontSize * 4.5);

  // Build SVG text elements in a staggered grid
  const texts: string[] = [];
  let row = 0;
  for (let y = fontSize; y < height + fontSize; y += rowHeight) {
    const offset = row % 2 === 1 ? Math.floor(colWidth / 2) : 0;
    for (let x = -colWidth + offset; x < width + colWidth; x += colWidth) {
      texts.push(
        `<text x="${x}" y="${y}" font-size="${fontSize}" font-family="sans-serif" font-weight="bold" fill="white" fill-opacity="0.6" stroke="#333" stroke-width="${Math.max(1, Math.floor(fontSize / 40))}" stroke-opacity="0.4">PETPICS</text>`
      );
    }
    row++;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${texts.join('')}</svg>`;

  return sharp(Buffer.from(svg))
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
