import { NextResponse } from 'next/server';
import { getAdminConfig } from '@/lib/db';

export async function GET() {
  try {
    const images = await getAdminConfig<Record<string, string>>('product_images') || {};
    return NextResponse.json({ images });
  } catch {
    return NextResponse.json({ images: {} });
  }
}
