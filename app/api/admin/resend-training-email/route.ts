import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserById, getModelById, getUserModels, getAdminConfig } from '@/lib/db';
import { sendTrainingCompleteEmailWithImages } from '@/lib/email';
import { isAdmin } from '@/lib/admin';
import { PetType } from '@/lib/petTypeDetection';
import { getPromptForPetType } from '@/lib/presetPrompts';
import { watermarkAndUpload } from '@/lib/watermark';

// Generate a single image using flux-lora
async function generateSingleImage(loraUrl: string, triggerWord: string, promptText: string): Promise<string | null> {
  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) return null;

  try {
    const fullPrompt = `Award-winning pet portrait of ${triggerWord}, ${promptText}, looking at camera with expressive eyes, sharp focus, professional DSLR quality`;

    const response = await fetch('https://fal.run/fal-ai/flux-lora', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        loras: [{ path: loraUrl, scale: 1 }],
        num_images: 1,
        image_size: { width: 1024, height: 1024 },
        num_inference_steps: 40,
        guidance_scale: 5.5,
        enable_safety_checker: false,
      }),
    });

    if (!response.ok) {
      console.error('Image generation failed:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.images?.[0]?.url || null;
  } catch (error) {
    console.error('Error generating image:', error);
    return null;
  }
}

// Generate sample images with watermarks
async function generateSampleImages(
  loraUrl: string,
  triggerWord: string,
  petType: PetType
): Promise<string[]> {
  try {
    console.log(`Generating sample images for resend email...`);

    // Get admin-configured sample prompt IDs
    const samplePromptIds = await getAdminConfig<string[]>('sample_prompt_ids') || ['studio-white', 'park-scene'];

    // Build prompts: preview + 2 admin-selected
    const previewPrompt = 'elegant studio portrait, crisp white backdrop, professional lighting, magazine cover quality';
    const samplePrompts = samplePromptIds.map(id => getPromptForPetType(id, petType));

    const allPrompts = [previewPrompt, ...samplePrompts];

    // Generate all 3 images in parallel
    const imagePromises = allPrompts.map(prompt => generateSingleImage(loraUrl, triggerWord, prompt));
    const imageUrls = await Promise.all(imagePromises);

    const validImageUrls = imageUrls.filter((url): url is string => url !== null);

    if (validImageUrls.length === 0) {
      console.error('No sample images generated successfully');
      return [];
    }

    // Watermark all images for email
    console.log(`Watermarking ${validImageUrls.length} images...`);
    const watermarkPromises = validImageUrls.map(async (url) => {
      try {
        return await watermarkAndUpload(url);
      } catch (error) {
        console.error(`Failed to watermark image ${url}:`, error);
        return url;
      }
    });
    const watermarkedUrls = await Promise.all(watermarkPromises);

    console.log(`Sample images generated and watermarked:`, watermarkedUrls);
    return watermarkedUrls;
  } catch (error) {
    console.error('Error generating sample images:', error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { modelId, userId, triggerWord } = await request.json();

    let model;
    let user;

    if (modelId) {
      // Lookup by modelId
      model = await getModelById(modelId);
      if (!model) {
        return NextResponse.json({ error: 'Model not found' }, { status: 404 });
      }
      user = await getUserById(model.user_id);
    } else if (userId && triggerWord) {
      // Lookup by userId + triggerWord
      user = await getUserById(userId);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      const userModels = await getUserModels(userId);
      model = userModels.find(m => m.trigger_word.toLowerCase() === triggerWord.toLowerCase());
      if (!model) {
        return NextResponse.json({
          error: 'Model not found',
          availableModels: userModels.map(m => ({ id: m.id, name: m.name, triggerWord: m.trigger_word }))
        }, { status: 404 });
      }
    } else {
      return NextResponse.json({ error: 'Either modelId or (userId + triggerWord) is required' }, { status: 400 });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log(`Admin resending training email for model ${modelId} (${model.trigger_word}) to ${user.email}`);

    // Generate fresh sample images with watermarks
    const petType: PetType = (model.pet_type as PetType) || 'dog';
    const sampleImages = await generateSampleImages(model.lora_url, model.trigger_word, petType);

    if (sampleImages.length === 0) {
      return NextResponse.json({ error: 'Failed to generate sample images' }, { status: 500 });
    }

    // Send the email
    await sendTrainingCompleteEmailWithImages(
      user.email,
      user.name || '',
      model.name,
      model.trigger_word,
      sampleImages
    );

    return NextResponse.json({
      success: true,
      message: `Training complete email sent to ${user.email}`,
      modelId,
      triggerWord: model.trigger_word,
      sampleImagesCount: sampleImages.length,
    });

  } catch (error) {
    console.error('Error resending training email:', error);
    return NextResponse.json(
      { error: 'Failed to resend email', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
