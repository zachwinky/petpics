import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateMockup } from '@/lib/printful';

/**
 * POST /api/print/mockup
 *
 * Generates a product mockup using Printful's Mockup Generator API.
 *
 * Body: { imageUrl: string, productId: number, variantIds?: number[] }
 * Returns: { mockupUrl: string } or { error: string }
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { imageUrl, productId, variantIds } = body;

    if (!imageUrl || !productId) {
      return NextResponse.json(
        { error: 'Must provide imageUrl and productId' },
        { status: 400 }
      );
    }

    const result = await generateMockup(productId, imageUrl, variantIds, 30000);

    if (!result || !result.mockups || result.mockups.length === 0) {
      return NextResponse.json(
        { error: 'Mockup generation timed out or returned no results' },
        { status: 504 }
      );
    }

    return NextResponse.json({
      mockupUrl: result.mockups[0].mockup_url,
      allMockups: result.mockups,
    });
  } catch (error) {
    console.error('Mockup generation error:', error);
    return NextResponse.json(
      { error: 'Mockup generation failed' },
      { status: 500 }
    );
  }
}
