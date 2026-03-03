import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { rateLimit } from '@/lib/rateLimit';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 uploads per hour per IP
    const rateLimitResult = await rateLimit(request, 10, 3600000);
    if (rateLimitResult.isRateLimited) {
      return NextResponse.json(
        { error: 'Too many uploads. Please try again later.' },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 20MB.' },
        { status: 400 }
      );
    }

    // Upload to FAL storage
    const blob = new Blob([await file.arrayBuffer()], { type: file.type });
    const imageUrl = await fal.storage.upload(blob);

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed. Please try again.' },
      { status: 500 }
    );
  }
}
