import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getModelById, updateModelProductDescription, mergeModelProductFeatures, ProductFeatures, ProductFeature } from '@/lib/db';

const FAL_KEY = process.env.FAL_KEY;

// Analyze a product image using LLaVA vision model to extract text only (legacy)
async function analyzeProductImageText(imageUrl: string): Promise<string> {
  const response = await fetch('https://fal.run/fal-ai/llava-next', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: imageUrl,
      prompt: `Look at this product image. List ONLY the text you can clearly read, with its location.

Rules:
- Only include text you are 100% certain about
- If text is blurry or unclear, skip it
- Do not describe the product itself (shape, color, material)
- Do not make up or guess any text
- Include where each text appears (e.g., "on front", "on cap", "near bottom")

Format: "TEXT" on [location]

Example output: "BRAND NAME" on front, "50ml" near bottom, "Made in USA" on back

If you cannot clearly read any text, respond with: NO_TEXT_VISIBLE`,
      max_tokens: 256,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('LLaVA API error:', errorText);
    throw new Error(`Failed to analyze product image: ${errorText}`);
  }

  const data = await response.json();
  return data.output || '';
}

// Comprehensive product analysis - extracts all visual features
async function analyzeProductComprehensive(imageUrl: string): Promise<ProductFeatures> {
  const response = await fetch('https://fal.run/fal-ai/llava-next', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: imageUrl,
      prompt: `Analyze this product image for accurate reproduction. Provide ONLY factual observations.

OUTPUT FORMAT (use exactly these headings):
TEXT: List all visible text with locations. Format: "TEXT" on [location]. If no text visible: "none"
SHAPE: Describe the product's form, proportions, and silhouette in 1-2 sentences.
COLORS: List all colors visible, from most to least prominent. Include any gradients or patterns.
MATERIALS: Describe apparent materials and surface textures (glass, metal, matte, glossy, plastic, etc.)
DISTINCTIVE: Note any unique visual features (embossing, patterns, special finishes, logos, etc.)

RULES:
- Only describe what you can clearly see
- Use specific color names (rose gold, not just gold; navy blue, not just blue)
- Describe proportions relatively (tall and narrow, squat and wide, etc.)
- Do not make assumptions about what you cannot see
- Keep each section concise (1-3 sentences max)

Example output:
TEXT: "LUXE" on front center, "100ml" on bottom
SHAPE: Tall cylindrical bottle with narrow neck and wide rounded cap
COLORS: Deep navy blue body, rose gold metallic cap, white text
MATERIALS: Frosted glass bottle, brushed metal cap with matte finish
DISTINCTIVE: Vertical ribbed texture on glass, embossed brand logo on cap`,
      max_tokens: 512,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('LLaVA comprehensive analysis error:', errorText);
    throw new Error(`Failed to analyze product image: ${errorText}`);
  }

  const data = await response.json();
  const output = data.output || '';

  return parseAnalysisOutput(output, 'ai_analysis');
}

// Parse LLaVA output into ProductFeatures structure
function parseAnalysisOutput(output: string, source: 'ai_analysis' | 'reference_image'): ProductFeatures {
  const features: ProductFeatures = {};
  const timestamp = new Date().toISOString();

  const patterns: Record<string, RegExp> = {
    text: /TEXT:\s*(.+?)(?=SHAPE:|$)/i,
    shape: /SHAPE:\s*(.+?)(?=COLORS:|$)/i,
    colors: /COLORS:\s*(.+?)(?=MATERIALS:|$)/i,
    materials: /MATERIALS:\s*(.+?)(?=DISTINCTIVE:|$)/i,
    distinctive: /DISTINCTIVE:\s*(.+?)$/i,
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = output.match(pattern);
    if (match && match[1]) {
      const content = match[1].trim();
      // Skip if content is empty, "none", or "N/A"
      if (content && content.toLowerCase() !== 'none' && content.toLowerCase() !== 'n/a') {
        const feature: ProductFeature = {
          content,
          source,
          updated_at: timestamp,
        };
        (features as Record<string, ProductFeature>)[key] = feature;
      }
    }
  }

  return features;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { modelId, imageUrl, comprehensive = false } = body;

    if (!modelId) {
      return NextResponse.json(
        { error: 'Model ID required' },
        { status: 400 }
      );
    }

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL required' },
        { status: 400 }
      );
    }

    // Verify the model belongs to this user
    const model = await getModelById(modelId, userId);
    if (!model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    console.log(`Analyzing product image for model ${modelId} (comprehensive: ${comprehensive})...`);

    if (comprehensive) {
      // Run comprehensive analysis and save to product_features
      const features = await analyzeProductComprehensive(imageUrl);
      console.log('Product features:', features);

      // Merge with existing features (keeping user_corrections if present)
      const updatedModel = await mergeModelProductFeatures(modelId, userId, features);

      // Also update legacy product_description for backward compatibility
      if (features.text?.content) {
        await updateModelProductDescription(modelId, features.text.content);
      }

      return NextResponse.json({
        success: true,
        features,
        model: updatedModel,
      });
    } else {
      // Legacy text-only analysis
      const productDescription = await analyzeProductImageText(imageUrl);
      console.log('Product description:', productDescription);

      // Save to legacy field
      const updatedModel = await updateModelProductDescription(modelId, productDescription);

      // Also save to product_features.text for new system
      if (productDescription && productDescription !== 'NO_TEXT_VISIBLE') {
        await mergeModelProductFeatures(modelId, userId, {
          text: {
            content: productDescription,
            source: 'ai_analysis',
            updated_at: new Date().toISOString(),
          }
        });
      }

      return NextResponse.json({
        success: true,
        productDescription,
        model: updatedModel,
      });
    }

  } catch (error) {
    console.error('Error analyzing product:', error);
    return NextResponse.json(
      {
        error: 'Analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Export for use in set-reference-image endpoint
export { analyzeProductComprehensive, parseAnalysisOutput };
