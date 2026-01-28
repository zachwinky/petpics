import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getModelById, updateModelProductDescription, mergeModelProductFeatures, ProductFeatures, ProductFeature } from '@/lib/db';

const FAL_KEY = process.env.FAL_KEY;

// Analyze a pet image to detect collar and read tag text
async function analyzeCollarText(imageUrl: string): Promise<string> {
  const response = await fetch('https://fal.run/fal-ai/llava-next', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: imageUrl,
      prompt: `Look at this pet image carefully. Identify if the pet is wearing a collar or tag.

TASK:
1. Is the pet wearing a collar? (yes/no)
2. If yes, describe the collar (color, type)
3. Is there a visible tag or text on the collar?
4. If there is text on the tag, read it exactly as shown

FORMAT your response as:
COLLAR: yes/no
COLLAR_DESCRIPTION: [color and type if visible, or "none"]
TAG_VISIBLE: yes/no
TAG_TEXT: [exact text if readable, or "not readable" if blurry, or "none" if no tag]

If no collar is visible, respond:
COLLAR: no
COLLAR_DESCRIPTION: none
TAG_VISIBLE: no
TAG_TEXT: none`,
      max_tokens: 256,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('LLaVA API error:', errorText);
    throw new Error(`Failed to analyze pet image: ${errorText}`);
  }

  const data = await response.json();
  return data.output || '';
}

// Comprehensive collar analysis - extracts all visible features
async function analyzeCollarComprehensive(imageUrl: string): Promise<ProductFeatures> {
  const response = await fetch('https://fal.run/fal-ai/llava-next', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: imageUrl,
      prompt: `Analyze this pet image for collar and tag detection.

OUTPUT FORMAT (use exactly these headings):
COLLAR: Is the pet wearing a collar? (yes/no)
COLLAR_COLOR: What color is the collar? (e.g., "red", "blue with white dots", or "none")
COLLAR_TYPE: What type of collar? (e.g., "fabric", "leather", "chain", "bandana", or "none")
TAG_VISIBLE: Is there a visible tag on the collar? (yes/no)
TAG_TEXT: What text is written on the tag? (exact text, or "not readable", or "none")
PET_NAME_GUESS: Based on the tag, what might the pet's name be? (name or "unknown")

RULES:
- Only describe what you can clearly see
- If the collar or tag is partially visible, note what you can see
- If text is blurry or unclear, say "not readable"
- Be specific about colors and materials`,
      max_tokens: 512,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('LLaVA comprehensive analysis error:', errorText);
    throw new Error(`Failed to analyze pet image: ${errorText}`);
  }

  const data = await response.json();
  const output = data.output || '';

  return parseCollarAnalysisOutput(output, 'ai_analysis');
}

// Parse LLaVA output into ProductFeatures structure (reusing the structure for collar data)
function parseCollarAnalysisOutput(output: string, source: 'ai_analysis' | 'reference_image'): ProductFeatures {
  const features: ProductFeatures = {};
  const timestamp = new Date().toISOString();

  const patterns: Record<string, RegExp> = {
    collar: /COLLAR:\s*(.+?)(?=COLLAR_COLOR:|$)/i,
    collar_color: /COLLAR_COLOR:\s*(.+?)(?=COLLAR_TYPE:|$)/i,
    collar_type: /COLLAR_TYPE:\s*(.+?)(?=TAG_VISIBLE:|$)/i,
    tag_visible: /TAG_VISIBLE:\s*(.+?)(?=TAG_TEXT:|$)/i,
    tag_text: /TAG_TEXT:\s*(.+?)(?=PET_NAME_GUESS:|$)/i,
    pet_name_guess: /PET_NAME_GUESS:\s*(.+?)$/i,
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

    console.log(`Analyzing collar for model ${modelId} (comprehensive: ${comprehensive})...`);

    if (comprehensive) {
      // Run comprehensive analysis and save to product_features
      const features = await analyzeCollarComprehensive(imageUrl);
      console.log('Collar features:', features);

      // Merge with existing features (keeping user_corrections if present)
      const updatedModel = await mergeModelProductFeatures(modelId, userId, features);

      // Also update legacy product_description for backward compatibility
      // Use type assertion since we're storing collar-specific fields dynamically
      const tagText = (features as Record<string, ProductFeature | undefined>).tag_text;
      if (tagText?.content) {
        await updateModelProductDescription(modelId, tagText.content);
      }

      return NextResponse.json({
        success: true,
        features,
        model: updatedModel,
      });
    } else {
      // Simple collar/tag analysis
      const collarDescription = await analyzeCollarText(imageUrl);
      console.log('Collar description:', collarDescription);

      // Save to legacy field
      const updatedModel = await updateModelProductDescription(modelId, collarDescription);

      // Also save to product_features for new system
      if (collarDescription) {
        await mergeModelProductFeatures(modelId, userId, {
          text: {
            content: collarDescription,
            source: 'ai_analysis',
            updated_at: new Date().toISOString(),
          }
        });
      }

      return NextResponse.json({
        success: true,
        collarDescription,
        model: updatedModel,
      });
    }

  } catch (error) {
    console.error('Error analyzing collar:', error);
    return NextResponse.json(
      {
        error: 'Analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Export for use in other endpoints if needed
export { analyzeCollarComprehensive, parseCollarAnalysisOutput };
