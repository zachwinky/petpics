import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getShippingRates, PrintfulRecipient } from '@/lib/printful';

/**
 * POST /api/print/shipping-rates
 *
 * Gets shipping rates from Printful for a given address and cart items.
 *
 * Body: {
 *   address: { name, address1, address2?, city, state?, zip, country },
 *   items: { variantId: number, quantity: number }[]
 * }
 * Returns: { rates: ShippingRate[] }
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { address, items } = body;

    if (!address || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Must provide address and items' },
        { status: 400 }
      );
    }

    const recipient: PrintfulRecipient = {
      name: address.name,
      address1: address.address1,
      address2: address.address2,
      city: address.city,
      state_code: address.state,
      country_code: address.country || 'US',
      zip: address.zip,
    };

    const printfulItems = items.map((item: { variantId: number; quantity: number }) => ({
      variant_id: item.variantId,
      quantity: item.quantity || 1,
    }));

    const rates = await getShippingRates(recipient, printfulItems);

    // Format rates with real dates
    const formattedRates = rates.map(rate => ({
      id: rate.id,
      name: rate.name,
      priceCents: Math.round(parseFloat(rate.rate) * 100),
      currency: rate.currency,
      minDeliveryDays: rate.minDeliveryDays,
      maxDeliveryDays: rate.maxDeliveryDays,
      minDeliveryDate: rate.minDeliveryDate,
      maxDeliveryDate: rate.maxDeliveryDate,
    }));

    return NextResponse.json({ rates: formattedRates });
  } catch (error) {
    console.error('Shipping rates error:', error);

    // Return fallback estimate if Printful API fails
    return NextResponse.json({
      rates: [
        {
          id: 'STANDARD',
          name: 'Standard Shipping',
          priceCents: 799, // $7.99 fallback estimate
          currency: 'USD',
          minDeliveryDays: 5,
          maxDeliveryDays: 10,
          minDeliveryDate: null,
          maxDeliveryDate: null,
        },
      ],
      isFallback: true,
    });
  }
}
