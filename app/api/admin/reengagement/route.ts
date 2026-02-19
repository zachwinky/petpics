import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdmin, getReengagementEligibleUsers } from '@/lib/admin';
import { getAdminConfig, setAdminConfig, getUserById, getUserModels } from '@/lib/db';
import { sendReengagementEmail } from '@/lib/email';
import { PetType } from '@/lib/petTypeDetection';
import { getPromptForPetType } from '@/lib/presetPrompts';
import { watermarkAndUpload } from '@/lib/watermark';

// Allow up to 5 minutes — each user takes ~30s for image generation + watermarking
export const maxDuration = 300;

// Generate a single image using flux-lora (same as resend-training-email)
async function generateSingleImage(loraUrl: string, triggerWord: string, promptText: string, petType?: string): Promise<string | null> {
  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) return null;

  try {
    const petLabel = petType === 'cat' ? 'cat' : 'pet';
    const fullPrompt = `Award-winning ${petLabel} portrait of ${triggerWord}, ${promptText}, natural pose, sharp focus, professional DSLR quality`;

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

// Generate 3 watermarked sample images for a model
async function generateWatermarkedSamples(
  loraUrl: string,
  triggerWord: string,
  petType: PetType
): Promise<string[]> {
  const samplePromptIds = await getAdminConfig<string[]>('sample_prompt_ids') || ['studio-white', 'park-scene'];
  const previewPrompt = 'elegant studio portrait, crisp white backdrop, professional lighting, magazine cover quality';
  const samplePrompts = samplePromptIds.map(id => getPromptForPetType(id, petType));
  const allPrompts = [previewPrompt, ...samplePrompts];

  // Generate images in parallel
  const imageUrls = await Promise.all(allPrompts.map(p => generateSingleImage(loraUrl, triggerWord, p, petType)));
  const validUrls = imageUrls.filter((url): url is string => url !== null);

  if (validUrls.length === 0) return [];

  // Watermark sequentially
  const watermarkedUrls: string[] = [];
  for (const url of validUrls) {
    try {
      watermarkedUrls.push(await watermarkAndUpload(url));
    } catch (error) {
      console.error(`Failed to watermark image:`, error);
    }
  }

  return watermarkedUrls;
}

// GET: Fetch eligible users for re-engagement
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const users = await getReengagementEligibleUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching reengagement users:', error);
    return NextResponse.json({ error: 'Failed to fetch eligible users' }, { status: 500 });
  }
}

// POST: Generate samples + send re-engagement emails to selected users
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { userIds } = await request.json();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'userIds must be a non-empty array' }, { status: 400 });
    }

    // Load eligible users for lookup
    const allEligible = await getReengagementEligibleUsers();
    const eligibleMap = new Map(allEligible.map(u => [u.id, u]));

    // Load current sent map
    const sentMap = await getAdminConfig<Record<string, { sentAt: string; sentBy: string }>>(
      'reengagement_sent_users'
    ) || {};

    const results: { userId: number; email: string; success: boolean; error?: string }[] = [];

    for (const userId of userIds) {
      const eligible = eligibleMap.get(userId);
      if (!eligible) {
        results.push({ userId, email: 'unknown', success: false, error: 'User not eligible or not found' });
        continue;
      }

      // Use the first (most recent) model
      const petName = eligible.pet_names[0] || 'your pet';
      const loraUrl = eligible.lora_urls[0];
      const petType = (eligible.pet_types[0] || 'dog') as PetType;

      if (!loraUrl) {
        results.push({ userId, email: eligible.email, success: false, error: 'No LoRA URL found' });
        continue;
      }

      try {
        console.log(`[reengagement] Processing user ${userId} (${eligible.email}), pet: ${petName}`);

        // Generate watermarked samples
        const watermarkedUrls = await generateWatermarkedSamples(loraUrl, petName, petType);

        if (watermarkedUrls.length === 0) {
          results.push({ userId, email: eligible.email, success: false, error: 'Failed to generate sample images' });
          continue;
        }

        // Look up user for name
        const user = await getUserById(userId);
        const userName = user?.name || '';

        // Send email
        await sendReengagementEmail(eligible.email, userName, petName, watermarkedUrls);

        // Mark as sent
        sentMap[String(userId)] = {
          sentAt: new Date().toISOString(),
          sentBy: session.user.email,
        };

        console.log(`[reengagement] Email sent to ${eligible.email}`);
        results.push({ userId, email: eligible.email, success: true });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`[reengagement] Failed for user ${userId}:`, msg);
        results.push({ userId, email: eligible.email, success: false, error: msg });
      }
    }

    // Persist sent map
    await setAdminConfig('reengagement_sent_users', sentMap);

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Sent ${successCount} emails, ${errorCount} failed`,
      successCount,
      errorCount,
      results,
    });
  } catch (error) {
    console.error('Error sending reengagement emails:', error);
    return NextResponse.json(
      { error: 'Failed to send emails', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
