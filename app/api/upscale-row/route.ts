import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserById, updateUserCredits, updateGenerationUpscale } from '@/lib/db';
import { Pool } from 'pg';

const FAL_KEY = process.env.FAL_KEY;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
});

// Upscale a single image using FAL Clarity Upscaler
async function upscaleImage(imageUrl: string): Promise<string> {
  const response = await fetch('https://fal.run/fal-ai/clarity-upscaler', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: imageUrl,
      upscale_factor: 2,
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
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 401 }
      );
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { generationId, rowIndex } = body;

    if (generationId === undefined || rowIndex === undefined) {
      return NextResponse.json(
        { error: 'Missing generationId or rowIndex' },
        { status: 400 }
      );
    }

    // Get the generation record
    const genResult = await pool.query(
      'SELECT * FROM generations WHERE id = $1 AND user_id = $2',
      [generationId, userId]
    );

    if (genResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Generation not found' },
        { status: 404 }
      );
    }

    const generation = genResult.rows[0];
    const imageUrls: string[] = generation.image_urls;
    const upscaleUsed: boolean = generation.upscale_used || false;

    // Calculate which images belong to this row (4 images per row)
    const startIdx = rowIndex * 4;
    const endIdx = Math.min(startIdx + 4, imageUrls.length);
    const rowImages = imageUrls.slice(startIdx, endIdx);

    if (rowImages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid row index' },
        { status: 400 }
      );
    }

    // First upscale is free, subsequent ones cost 1 credit
    const isFreeUpscale = !upscaleUsed;
    const creditsRequired = isFreeUpscale ? 0 : 1;

    if (!isFreeUpscale && user.credits_balance < creditsRequired) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          required: creditsRequired,
          current: user.credits_balance
        },
        { status: 402 }
      );
    }

    // Deduct credits only if not free
    if (!isFreeUpscale) {
      await updateUserCredits(
        userId,
        -creditsRequired,
        'generation',
        `Upscale row ${rowIndex + 1}: ${rowImages.length} images`
      );
    }

    try {
      // Upscale all images in the row in parallel
      console.log(`Upscaling ${rowImages.length} images for row ${rowIndex}`);

      const upscalePromises = rowImages.map(async (url, index) => {
        try {
          console.log(`Upscaling image ${index + 1}/${rowImages.length}`);
          return await upscaleImage(url);
        } catch (error) {
          console.error(`Failed to upscale image ${index + 1}:`, error);
          return url; // Return original if upscale fails
        }
      });

      const upscaledImages = await Promise.all(upscalePromises);

      // Update the generation record with upscaled images and mark upscale as used
      const newImageUrls = [...imageUrls];
      for (let i = 0; i < upscaledImages.length; i++) {
        newImageUrls[startIdx + i] = upscaledImages[i];
      }

      // Use the new function to update images and mark upscale as used
      await updateGenerationUpscale(generationId, userId, newImageUrls, true);

      return NextResponse.json({
        success: true,
        imageUrls: upscaledImages,
        message: `Upscaled ${upscaledImages.length} images`,
        upscaleUsed: true  // Tell frontend that upscale is now used
      });

    } catch (error) {
      console.error('Upscale error:', error);

      // Refund credits on failure (only if it wasn't free)
      if (!isFreeUpscale) {
        await updateUserCredits(
          userId,
          creditsRequired,
          'generation',
          `Refund: Upscale failed`
        );
      }

      return NextResponse.json(
        { error: 'Upscale failed', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Upscale row error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
