import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_IMAGES = 20;

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 requests per minute per IP
    const rateLimitResult = await rateLimit(request, 5, 60000);
    if (rateLimitResult.isRateLimited) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: rateLimitResult.retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter.toString(),
          }
        }
      );
    }

    const formData = await request.formData();
    const images = formData.getAll('images') as File[];
    const prompt = formData.get('prompt') as string;

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: 'No images provided' },
        { status: 400 }
      );
    }

    // Validate image count
    if (images.length > MAX_IMAGES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_IMAGES} images allowed` },
        { status: 400 }
      );
    }

    // Validate file sizes
    for (const image of images) {
      if (image.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File ${image.name} exceeds maximum size of 10MB` },
          { status: 400 }
        );
      }
    }

    const apiKey = process.env.PEBBLELY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Pebblely API key not configured' },
        { status: 500 }
      );
    }

    // Step 1: Remove background from all product images
    const productsWithoutBg: string[] = [];

    for (const image of images) {
      // Convert image to base64
      const imageBuffer = await image.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');

      const removeBackgroundResponse = await fetch(
        'https://api.pebblely.com/remove-background/v1',
        {
          method: 'POST',
          headers: {
            'X-Pebblely-Access-Token': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: base64Image,
          }),
        }
      );

      if (!removeBackgroundResponse.ok) {
        const errorText = await removeBackgroundResponse.text();
        console.error('Pebblely remove background error:', errorText);
        return NextResponse.json(
          { error: 'Failed to remove background', details: errorText },
          { status: removeBackgroundResponse.status }
        );
      }

      const removeBackgroundData = await removeBackgroundResponse.json();
      productsWithoutBg.push(removeBackgroundData.data);
    }

    // Step 2: Create new background with all products
    const createBackgroundResponse = await fetch(
      'https://api.pebblely.com/create-background/v2',
      {
        method: 'POST',
        headers: {
          'X-Pebblely-Access-Token': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: productsWithoutBg, // v2 API expects an array of images
          description: prompt || 'professional pet photoshoot, studio lighting, elegant background',
          generate_plus: true, // Use enhanced quality mode
          autoresize: true, // Automatically resize and center to prevent cutoff
        }),
      }
    );

    if (!createBackgroundResponse.ok) {
      const errorText = await createBackgroundResponse.text();
      console.error('Pebblely create background error:', errorText);
      return NextResponse.json(
        { error: 'Failed to generate background', details: errorText },
        { status: createBackgroundResponse.status }
      );
    }

    const createBackgroundData = await createBackgroundResponse.json();
    const generatedImageBase64 = createBackgroundData.data;
    const imageUrl = `data:image/png;base64,${generatedImageBase64}`;

    return NextResponse.json({
      success: true,
      imageUrl,
      creditsRemaining: createBackgroundData.credits,
    });

  } catch (error) {
    console.error('Error generating image:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
