import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAdminConfig, setAdminConfig } from '@/lib/db';
import { isAdmin } from '@/lib/admin';

export interface ProductImages {
  canvas?: string;
  poster?: string;
  mug?: string;
  hero_canvas?: string;
  hero_poster?: string;
  hero_mug?: string;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const images = await getAdminConfig<ProductImages>('product_images') || {};
    return NextResponse.json({ images });
  } catch (error) {
    console.error('Error fetching product images config:', error);
    return NextResponse.json({ error: 'Failed to fetch product images config' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { images } = await request.json();

    if (!images || typeof images !== 'object') {
      return NextResponse.json({ error: 'images must be an object' }, { status: 400 });
    }

    // Validate: only allow known keys with string URLs
    const allowed = ['canvas', 'poster', 'mug', 'hero_canvas', 'hero_poster', 'hero_mug'];
    const cleaned: ProductImages = {};
    for (const key of allowed) {
      if (images[key] && typeof images[key] === 'string') {
        (cleaned as Record<string, string>)[key] = images[key].trim();
      }
    }

    await setAdminConfig('product_images', cleaned);

    return NextResponse.json({ success: true, images: cleaned });
  } catch (error) {
    console.error('Error saving product images config:', error);
    return NextResponse.json({ error: 'Failed to save product images config' }, { status: 500 });
  }
}
