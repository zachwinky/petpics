import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAdminConfig, setAdminConfig } from '@/lib/db';
import { isAdmin } from '@/lib/admin';

export interface GalleryImage {
  url: string;
  alt: string;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const images = await getAdminConfig<GalleryImage[]>('hero_gallery_images') || [];
    return NextResponse.json({ images });
  } catch (error) {
    console.error('Error fetching gallery config:', error);
    return NextResponse.json({ error: 'Failed to fetch gallery config' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { images } = await request.json();

    if (!Array.isArray(images)) {
      return NextResponse.json({ error: 'images must be an array' }, { status: 400 });
    }

    // Validate each image has url and alt
    for (const img of images) {
      if (!img.url || typeof img.url !== 'string') {
        return NextResponse.json({ error: 'Each image must have a url string' }, { status: 400 });
      }
      if (!img.alt || typeof img.alt !== 'string') {
        return NextResponse.json({ error: 'Each image must have an alt string' }, { status: 400 });
      }
    }

    await setAdminConfig('hero_gallery_images', images);

    return NextResponse.json({ success: true, images });
  } catch (error) {
    console.error('Error saving gallery config:', error);
    return NextResponse.json({ error: 'Failed to save gallery config' }, { status: 500 });
  }
}
