const FAL_KEY = process.env.FAL_KEY;

/**
 * Upscale a single image using FAL Clarity Upscaler.
 * Reusable across batch-generate (2x) and print preparation (4x).
 */
export async function upscaleImage(
  imageUrl: string,
  upscaleFactor: number = 2
): Promise<string> {
  if (!FAL_KEY) {
    throw new Error('FAL_KEY not configured — cannot upscale for print');
  }

  const response = await fetch('https://fal.run/fal-ai/clarity-upscaler', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: imageUrl,
      upscale_factor: upscaleFactor,
      prompt: 'professional pet photography, high quality, sharp details, studio lighting',
      negative_prompt: '(worst quality, low quality, blurry, noise, artifacts:2)',
      creativity: 0.2,
      resemblance: 0.8,
      num_inference_steps: 20,
      enable_safety_checker: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Upscale error:', errorText);
    throw new Error(`Upscale failed: ${errorText}`);
  }

  const data = await response.json();
  return data.image?.url || imageUrl;
}

/**
 * Upscale an image to print-ready resolution.
 * Uses 4x upscale: 1024px → 4096px.
 * Suitable for:
 *   - 10×10" canvas (3000×3000 needed) ✅
 *   - 12×16" products (3600×4800 needed — covers width) ✅
 *   - Mugs (2400×1000 needed) ✅
 *   - 16×20" products (4800×6000 needed — marginal) ⚠️
 */
export async function upscaleForPrint(imageUrl: string): Promise<string> {
  return upscaleImage(imageUrl, 4);
}

/**
 * Check if a given image resolution meets the minimum requirements
 * for a specific product.
 */
export function checkPrintQuality(
  imageWidth: number,
  imageHeight: number,
  minWidth: number,
  minHeight: number
): 'best' | 'good' | 'insufficient' {
  // Allow 10% tolerance for "best" quality
  const bestThreshold = 0.9;

  if (imageWidth >= minWidth * bestThreshold && imageHeight >= minHeight * bestThreshold) {
    return 'best';
  }

  // Allow 60% for "good" quality (will still look acceptable)
  const goodThreshold = 0.6;
  if (imageWidth >= minWidth * goodThreshold && imageHeight >= minHeight * goodThreshold) {
    return 'good';
  }

  return 'insufficient';
}
