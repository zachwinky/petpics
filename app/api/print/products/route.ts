import { NextResponse } from 'next/server';
import { getActiveProducts } from '@/lib/db';

/**
 * GET /api/print/products
 *
 * Returns all active print products. Public endpoint (no auth required)
 * since product catalog is not user-specific.
 */
export async function GET() {
  try {
    const products = await getActiveProducts();
    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
