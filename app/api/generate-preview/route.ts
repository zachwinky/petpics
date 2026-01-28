import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserById, getModelById, updateModelPreview } from '@/lib/db';

const FAL_KEY = process.env.FAL_KEY;

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
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { modelId, loraUrl, triggerWord } = body;

    if (!modelId || !loraUrl || !triggerWord) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify model ownership
    const model = await getModelById(modelId, userId);
    if (!model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    // Generate free preview with FAL API - backgroundless
    const falResponse = await fetch('https://fal.run/fal-ai/flux-lora', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: `Professional pet photography of ${triggerWord}, white background, studio lighting, high quality, detailed`,
        loras: [
          {
            path: loraUrl,
            scale: 1,
          },
        ],
        num_images: 1, // Free preview = 1 image
        image_size: {
          width: 1024,
          height: 1024,
        },
        num_inference_steps: 28,
        guidance_scale: 3.5,
        enable_safety_checker: false,
      }),
    });

    if (!falResponse.ok) {
      const errorText = await falResponse.text();
      console.error('FAL API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to generate preview', details: errorText },
        { status: 500 }
      );
    }

    const falData = await falResponse.json();
    const imageUrl = falData.images?.[0]?.url;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'No image generated' },
        { status: 500 }
      );
    }

    // Save preview URL to model
    await updateModelPreview(modelId, userId, imageUrl);

    return NextResponse.json({
      success: true,
      imageUrl,
    });

  } catch (error) {
    console.error('Preview generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
