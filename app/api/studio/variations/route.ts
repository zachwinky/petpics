import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserById, getModelById, getGenerationById, createGeneration } from '@/lib/db';
import { getPromptForPetType, PetType } from '@/lib/presetPrompts';
import { getStudioSceneById } from '@/lib/studioScenes';
import { rateLimit } from '@/lib/rateLimit';
import { getGenerationSize } from '@/lib/productDimensions';

const FAL_KEY = process.env.FAL_KEY;

/**
 * POST /api/studio/variations
 *
 * Generates 3 variations of a single scene.
 * This is FREE (no credit cost).
 *
 * Body: { modelId: number, sceneId: string, originalGenerationId: number }
 * Returns: { success: true, imageUrls: string[], generationId: number }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 5 requests per minute per IP
    const rateLimitResult = await rateLimit(request, 5, 60 * 1000);
    if (rateLimitResult.isRateLimited) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment and try again.' },
        { status: 429 }
      );
    }

    const userId = parseInt(session.user.id);
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { modelId, sceneId, originalGenerationId, productType } = body;

    if (!modelId || !sceneId) {
      return NextResponse.json(
        { error: 'Must provide modelId and sceneId' },
        { status: 400 }
      );
    }

    const model = await getModelById(modelId, userId);
    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    const scene = getStudioSceneById(sceneId);
    if (!scene) {
      return NextResponse.json({ error: 'Invalid scene ID' }, { status: 400 });
    }

    // Verify the original generation exists and belongs to this user
    if (originalGenerationId) {
      const originalGen = await getGenerationById(originalGenerationId, userId);
      if (!originalGen) {
        return NextResponse.json({ error: 'Original generation not found' }, { status: 404 });
      }
    }

    const petType: PetType = (model.pet_type as PetType) || 'dog';
    const petLabel = petType === 'cat' ? 'cat' : 'pet';
    const promptText = getPromptForPetType(scene.promptId, petType);
    const imageSize = getGenerationSize(productType);

    // Generate 3 variations in parallel (3 separate FAL calls for maximum variety)
    const generatePromises = Array.from({ length: 3 }, async () => {
      const fullPrompt = `Award-winning ${petLabel} portrait of ${model.trigger_word}, ${promptText}, natural pose, sharp focus, shallow depth of field, professional DSLR quality, 8k detail`;

      const falResponse = await fetch('https://fal.run/fal-ai/flux-lora', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${FAL_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          loras: [{ path: model.lora_url, scale: 1 }],
          num_images: 1,
          image_size: imageSize,
          num_inference_steps: 40,
          guidance_scale: 5.5,
          enable_safety_checker: false,
        }),
      });

      if (!falResponse.ok) {
        const errorText = await falResponse.text();
        console.error('FAL API error:', errorText);
        throw new Error(`FAL API error: ${errorText}`);
      }

      const falData = await falResponse.json();
      return falData.images?.[0]?.url || null;
    });

    const imageUrls = await Promise.all(generatePromises);
    const validUrls = imageUrls.filter((url): url is string => url !== null);

    if (validUrls.length === 0) {
      return NextResponse.json(
        { error: 'All variation generations failed' },
        { status: 500 }
      );
    }

    // Store as a new generation (0 credits — free for Studio)
    const rowPrompts = validUrls.map(() => promptText);
    const generation = await createGeneration(
      userId,
      modelId,
      null,
      `variation:${sceneId}`,
      validUrls,
      0,
      rowPrompts,
      undefined,
      productType || 'square'
    );

    return NextResponse.json({
      success: true,
      imageUrls: validUrls,
      generationId: generation.id,
      sceneId,
    });

  } catch (error) {
    console.error('Studio variations error:', error);
    return NextResponse.json(
      { error: 'Variation generation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
