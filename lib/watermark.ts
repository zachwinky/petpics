import sharp from 'sharp';

/**
 * Add a diagonal watermark pattern to an image.
 * Uses Sharp's native Pango text rendering (not SVG/librsvg) for reliable output.
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

  // Create watermark overlay using native Pango text rendering
  const watermarkOverlay = await createWatermarkOverlay(width, height);

  // Composite the watermark onto the image
  const watermarkedImage = await sharp(imageBuffer)
    .composite([
      {
        input: watermarkOverlay,
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer();

  return watermarkedImage;
}

/**
 * Create watermark overlay using Sharp's native Pango text rendering.
 * This bypasses SVG/librsvg entirely, which has proven unreliable for text.
 *
 * Strategy:
 * 1. Render "PETPICS" text via Pango (black outline + white fill)
 * 2. Combine into a single semi-transparent tile
 * 3. Tile across a large canvas, rotate -30°, crop to image size
 */
async function createWatermarkOverlay(width: number, height: number): Promise<Buffer> {
  const fontSize = Math.max(80, Math.floor(width / 5));

  // Render white and black text via Sharp's native Pango text engine
  const [whiteBuf, blackBuf] = await Promise.all([
    sharp({
      text: {
        text: `<span foreground="white" font="bold ${fontSize}">PETPICS</span>`,
        rgba: true,
        dpi: 72,
      },
    }).png().toBuffer(),
    sharp({
      text: {
        text: `<span foreground="#333333" font="bold ${fontSize}">PETPICS</span>`,
        rgba: true,
        dpi: 72,
      },
    }).png().toBuffer(),
  ]);

  const textMeta = await sharp(whiteBuf).metadata();
  const tw = textMeta.width!;
  const th = textMeta.height!;

  // Build a single tile with outline: place black text at 8 offsets, white on top
  const pad = Math.max(3, Math.floor(fontSize / 50));
  const tileW = tw + pad * 2;
  const tileH = th + pad * 2;

  const outlineOffsets = [
    [0, pad], [pad * 2, pad],       // left, right
    [pad, 0], [pad, pad * 2],       // top, bottom
    [0, 0], [pad * 2, 0],           // top-left, top-right
    [0, pad * 2], [pad * 2, pad * 2], // bottom-left, bottom-right
  ];

  const tileComposites = [
    ...outlineOffsets.map(([l, t]) => ({ input: blackBuf, left: l, top: t })),
    { input: whiteBuf, left: pad, top: pad }, // white fill centered
  ];

  // Create tile with semi-transparency (0.65 alpha multiplier)
  const tile = await sharp({
    create: { width: tileW, height: tileH, channels: 4 as const, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(tileComposites)
    .ensureAlpha()
    .linear([1, 1, 1, 0.65], [0, 0, 0, 0])
    .png()
    .toBuffer();

  // Tile across a canvas large enough to cover the image after rotation
  const gapX = Math.floor(tw * 0.3);
  const gapY = Math.floor(th * 0.8);

  const diagSize = Math.ceil(Math.sqrt(width * width + height * height));
  const patternW = diagSize * 2;
  const patternH = diagSize * 2;

  const composites: { input: Buffer; top: number; left: number }[] = [];
  for (let y = 0; y < patternH; y += tileH + gapY) {
    const row = Math.floor(y / (tileH + gapY));
    const offsetX = row % 2 === 1 ? Math.floor((tileW + gapX) / 2) : 0;
    for (let x = 0; x < patternW; x += tileW + gapX) {
      const left = x + offsetX;
      if (left + tileW <= patternW && y + tileH <= patternH) {
        composites.push({ input: tile, top: y, left });
      }
    }
  }

  // Create pattern, rotate, and crop to image dimensions
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
