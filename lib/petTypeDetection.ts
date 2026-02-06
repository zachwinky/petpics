const FAL_KEY = process.env.FAL_KEY;

export type PetType = 'dog' | 'cat' | 'unknown';

/**
 * Detect whether the pet in an image is a dog or cat using LLaVA vision model.
 * Returns 'unknown' if detection fails or the pet type can't be determined.
 */
export async function detectPetType(imageUrl: string): Promise<PetType> {
  if (!FAL_KEY) {
    console.error('FAL_KEY not configured for pet type detection');
    return 'unknown';
  }

  try {
    const response = await fetch('https://fal.run/fal-ai/llava-next', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        prompt: `What type of pet is in this image?

Answer with ONLY one word:
- DOG (if it's a dog of any breed)
- CAT (if it's a cat of any breed)
- OTHER (if it's neither or unclear)

Response:`,
        max_tokens: 10,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.error('LLaVA pet detection failed:', response.status);
      return 'unknown';
    }

    const data = await response.json();
    const output = (data.output || '').toUpperCase().trim();

    console.log('Pet type detection result:', output);

    if (output.includes('DOG')) return 'dog';
    if (output.includes('CAT')) return 'cat';
    return 'unknown';
  } catch (error) {
    console.error('Pet type detection error:', error);
    return 'unknown'; // Default to unknown on error (will use dog prompts)
  }
}
