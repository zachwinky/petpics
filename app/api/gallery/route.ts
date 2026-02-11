import { NextResponse } from 'next/server';
import { getAdminConfig } from '@/lib/db';

export interface GalleryImage {
  url: string;
  alt: string;
}

export async function GET() {
  try {
    const images = await getAdminConfig<GalleryImage[]>('hero_gallery_images') || [];
    return NextResponse.json({ images });
  } catch (error) {
    console.error('Error fetching gallery images:', error);
    return NextResponse.json({ images: [] });
  }
}
