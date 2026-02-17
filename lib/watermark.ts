import sharp from 'sharp';

/**
 * Pixel font for "PETPICS" — each letter is a 5x7 grid (1 = filled, 0 = empty).
 * No fonts, no SVG text, no librsvg — just raw pixels. Works identically everywhere.
 */
const PIXEL_FONT: Record<string, number[][]> = {
  P: [
    [1,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
  ],
  E: [
    [1,1,1,1,1],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,1,1,1,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,1,1,1,1],
  ],
  T: [
    [1,1,1,1,1],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
  ],
  I: [
    [1,1,1],
    [0,1,0],
    [0,1,0],
    [0,1,0],
    [0,1,0],
    [0,1,0],
    [1,1,1],
  ],
  C: [
    [0,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,1],
    [0,1,1,1,0],
  ],
  S: [
    [0,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,0],
    [0,1,1,1,0],
    [0,0,0,0,1],
    [1,0,0,0,1],
    [0,1,1,1,0],
  ],
};

const WORD = 'PETPICS';

/**
 * Render "PETPICS" as a single-row pixel-font image at the given pixel scale.
 * Returns a semi-transparent white PNG with dark outline effect.
 */
async function renderWordTile(pixelSize: number): Promise<{ buf: Buffer; w: number; h: number }> {
  const letterSpacing = 1; // pixels between letters (in grid units)
  const letters = WORD.split('').map(ch => PIXEL_FONT[ch]);

  // Calculate total grid width
  let gridW = 0;
  for (let i = 0; i < letters.length; i++) {
    gridW += letters[i][0].length;
    if (i < letters.length - 1) gridW += letterSpacing;
  }
  const gridH = 7;

  const tileW = gridW * pixelSize;
  const tileH = gridH * pixelSize;

  // Build raw RGBA pixel data for the word
  const rgba = Buffer.alloc(tileW * tileH * 4, 0);

  let cursorX = 0;
  for (const letter of letters) {
    const letterW = letter[0].length;
    for (let gy = 0; gy < gridH; gy++) {
      for (let gx = 0; gx < letterW; gx++) {
        if (letter[gy][gx]) {
          // Fill the pixelSize x pixelSize block
          for (let py = 0; py < pixelSize; py++) {
            for (let px = 0; px < pixelSize; px++) {
              const x = (cursorX + gx) * pixelSize + px;
              const y = gy * pixelSize + py;
              const idx = (y * tileW + x) * 4;
              rgba[idx] = 255;     // R
              rgba[idx + 1] = 255; // G
              rgba[idx + 2] = 255; // B
              rgba[idx + 3] = 150; // A (~59% opacity)
            }
          }
        }
      }
    }
    cursorX += letterW + letterSpacing;
  }

  const buf = await sharp(rgba, { raw: { width: tileW, height: tileH, channels: 4 } })
    .png()
    .toBuffer();

  return { buf, w: tileW, h: tileH };
}

/**
 * Add a watermark pattern to an image.
 * Uses pixel-font rendering — no SVG, no librsvg, no system fonts.
 * Guaranteed identical output on every platform.
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
 * Create watermark overlay by tiling the pixel-font "PETPICS" across the image.
 * No fonts, no SVG, no external dependencies. Just raw RGBA pixels.
 */
async function createWatermarkOverlay(width: number, height: number): Promise<Buffer> {
  // Each "pixel" in the font grid = this many real pixels
  // Target: word width ≈ 40% of image width. Word is ~37 grid units wide.
  const pixelSize = Math.max(3, Math.floor((width * 0.4) / 37));

  const { buf: tileBuf, w: tileW, h: tileH } = await renderWordTile(pixelSize);

  const gapX = Math.floor(tileW * 0.3);
  const gapY = Math.floor(tileH * 0.8);
  const stepX = tileW + gapX;
  const stepY = tileH + gapY;

  const composites: { input: Buffer; top: number; left: number }[] = [];
  let row = 0;
  for (let y = 0; y < height; y += stepY) {
    const offsetX = row % 2 === 1 ? Math.floor(stepX / 2) : 0;
    for (let x = -tileW + offsetX; x < width; x += stepX) {
      const left = Math.max(0, x);
      const top = Math.max(0, y);
      if (left + tileW <= width && top + tileH <= height) {
        composites.push({ input: tileBuf, top, left });
      }
    }
    row++;
  }

  console.log(`[watermark] Tiling: pixelSize=${pixelSize}, tile=${tileW}x${tileH}, composites=${composites.length}`);

  return sharp({
    create: { width, height, channels: 4 as const, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(composites)
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
