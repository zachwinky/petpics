const FAL_KEY = process.env.FAL_KEY;

// Quality threshold - images below this score get blurred
export const QUALITY_THRESHOLD = 0.22;

/**
 * Score a single image against a text prompt using CLIP
 * Returns a similarity score (typically 0.15-0.35 range)
 */
export async function scoreImageQuality(imageUrl: string, prompt: string): Promise<number> {
  if (!FAL_KEY) {
    console.error('FAL_KEY not configured for quality scoring');
    return 1; // Return high score to avoid false positives
  }

  try {
    const response = await fetch('https://fal.run/fal-ai/clip-score', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        text: prompt,
      }),
    });

    if (!response.ok) {
      console.error('CLIP score API error:', await response.text());
      return 1; // Return high score to avoid false positives on error
    }

    const data = await response.json();
    return data.score || 1;
  } catch (error) {
    console.error('Error scoring image quality:', error);
    return 1; // Return high score to avoid false positives on error
  }
}

/**
 * Score multiple images in parallel against a prompt
 * Returns array of scores in same order as input URLs
 */
export async function scoreAllImages(imageUrls: string[], prompt: string): Promise<number[]> {
  const scores = await Promise.all(
    imageUrls.map(url => scoreImageQuality(url, prompt))
  );
  return scores;
}

/**
 * Score images with their individual prompts (for multi-scene generations)
 * Each image is scored against the prompt that was used to generate it
 */
export async function scoreImagesWithPrompts(
  imageUrls: string[],
  rowPrompts: string[],
  triggerWord: string
): Promise<number[]> {
  // Each row of 4 images uses the same prompt
  const scores = await Promise.all(
    imageUrls.map((url, index) => {
      const rowIndex = Math.floor(index / 4);
      const basePrompt = rowPrompts[rowIndex] || rowPrompts[0];
      const fullPrompt = `Professional pet photography of ${triggerWord}, ${basePrompt}, high quality, detailed, studio lighting`;
      return scoreImageQuality(url, fullPrompt);
    })
  );
  return scores;
}

/**
 * Check if an image passes quality threshold
 */
export function isHighQuality(score: number): boolean {
  return score >= QUALITY_THRESHOLD;
}

/**
 * Count how many images pass quality threshold
 */
export function countHighQualityImages(scores: number[]): number {
  return scores.filter(score => isHighQuality(score)).length;
}
