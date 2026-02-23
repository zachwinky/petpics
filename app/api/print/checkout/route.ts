import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import {
  getUserById, getProductById,
  createPrintOrder, createPrintOrderItem, updatePrintOrderPrintfulId,
} from '@/lib/db';
import { uploadFile, createOrder as createPrintfulOrder, confirmOrder, PrintfulRecipient } from '@/lib/printful';
import { upscaleForPrint } from '@/lib/print-upscale';

export const maxDuration = 60;

interface CheckoutItem {
  imageUrl: string;
  generationId: number;
  imageIndex: number;
  productType: string;
  productId: number;
  sizeLabel: string;
  variantId: number;
  priceCents: number;
  options: Record<string, string>;
}

interface CheckoutAddress {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state?: string;
  zip: string;
  country: string;
}

/**
 * POST /api/print/checkout
 *
 * Orchestrates the full print order:
 * 1. Validate cart items against product catalog
 * 2. Create Stripe Checkout Session (hosted checkout)
 * 3. Return checkout URL — order + Printful submission happen after payment via webhook
 *
 * Body: {
 *   items: CheckoutItem[],
 *   address: CheckoutAddress,
 *   shippingMethod: string,
 *   shippingCents: number
 * }
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { items, address, shippingMethod, shippingCents } = body as {
      items: CheckoutItem[];
      address: CheckoutAddress;
      shippingMethod: string;
      shippingCents: number;
    };

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    if (!address?.name || !address?.address1 || !address?.city || !address?.zip) {
      return NextResponse.json({ error: 'Incomplete shipping address' }, { status: 400 });
    }

    // Validate all items against product catalog
    let subtotalCents = 0;
    const validatedItems: (CheckoutItem & { product: Awaited<ReturnType<typeof getProductById>> })[] = [];

    for (const item of items) {
      const product = await getProductById(item.productId);
      if (!product || !product.active) {
        return NextResponse.json(
          { error: `Product "${item.sizeLabel}" is no longer available` },
          { status: 400 }
        );
      }

      // Verify price matches catalog (prevent client-side tampering)
      if (item.priceCents !== product.price_cents) {
        return NextResponse.json(
          { error: 'Price mismatch — please refresh and try again' },
          { status: 400 }
        );
      }

      subtotalCents += product.price_cents;
      validatedItems.push({ ...item, product });
    }

    const totalCents = subtotalCents + (shippingCents || 0);

    // Build Stripe line items
    const lineItems = validatedItems.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.product!.display_name,
          description: `Pet portrait — ${item.sizeLabel}`,
          images: [item.imageUrl],
        },
        unit_amount: item.priceCents,
      },
      quantity: 1,
    }));

    // Add shipping as a line item
    if (shippingCents > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Shipping (${shippingMethod || 'Standard'})`,
            description: 'Delivery to your door',
            images: [],
          },
          unit_amount: shippingCents,
        },
        quantity: 1,
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://petpics.akoolai.com';

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      automatic_tax: { enabled: true },
      success_url: `${baseUrl}/print/order/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/print/cart?payment=cancelled`,
      metadata: {
        userId: userId.toString(),
        orderType: 'print',
        itemsJson: JSON.stringify(validatedItems.map(item => ({
          imageUrl: item.imageUrl,
          generationId: item.generationId,
          imageIndex: item.imageIndex,
          productId: item.productId,
          productType: item.productType,
          sizeLabel: item.sizeLabel,
          variantId: item.variantId,
          priceCents: item.priceCents,
          options: item.options,
        }))),
        addressJson: JSON.stringify(address),
        shippingMethod: shippingMethod || 'STANDARD',
        shippingCents: (shippingCents || 0).toString(),
        subtotalCents: subtotalCents.toString(),
        totalCents: totalCents.toString(),
      },
    });

    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    });

  } catch (error) {
    console.error('Print checkout error:', error);
    return NextResponse.json(
      { error: 'Checkout failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Fulfills a print order after successful payment.
 * Called from the Stripe webhook handler.
 */
export async function fulfillPrintOrder(
  userId: number,
  stripePaymentIntentId: string,
  items: CheckoutItem[],
  address: CheckoutAddress,
  shippingMethod: string,
  subtotalCents: number,
  shippingCents: number,
  totalCents: number,
  taxCents: number = 0
): Promise<{ orderId: number; printfulOrderId?: string }> {
  // 1. Create the order in our database
  const order = await createPrintOrder(
    userId,
    null, // model_id — could be derived from generation but not critical
    stripePaymentIntentId,
    {
      name: address.name,
      address1: address.address1,
      address2: address.address2,
      city: address.city,
      state: address.state,
      zip: address.zip,
      country: address.country || 'US',
    },
    shippingMethod,
    subtotalCents,
    shippingCents,
    taxCents,
    totalCents
  );

  // 2. Create order items and prepare Printful files
  const printfulItems = [];

  for (const item of items) {
    // Resolve correct Printful variant ID for framed posters by frame color
    let resolvedVariantId = item.variantId;
    if (item.productType === 'framed_poster' && item.options?.frameColor) {
      try {
        const product = await getProductById(item.productId);
        const variantMap = (product?.options as Record<string, unknown>)?.variant_ids_by_color as Record<string, number> | undefined;
        if (variantMap && variantMap[item.options.frameColor]) {
          resolvedVariantId = variantMap[item.options.frameColor];
        }
      } catch {
        // Fall through to use client-provided variantId
      }
    }

    // Upscale image for print resolution
    let printReadyUrl = item.imageUrl;
    try {
      printReadyUrl = await upscaleForPrint(item.imageUrl);
    } catch (err) {
      console.error('Print upscale failed, using original:', err);
      // Continue with original — may be lower quality but don't block the order
    }

    // Create DB record
    const orderItem = await createPrintOrderItem(
      order.id,
      item.generationId || null,
      item.imageIndex || 0,
      resolvedVariantId,
      item.productType,
      item.sizeLabel,
      item.priceCents,
      printReadyUrl,
      item.options
    );

    printfulItems.push({
      variant_id: resolvedVariantId,
      quantity: 1,
      files: [{ url: printReadyUrl }],
      _orderItemId: orderItem.id,
    });
  }

  // 3. Create Printful order (with idempotency via external_id)
  try {
    const recipient: PrintfulRecipient = {
      name: address.name,
      address1: address.address1,
      address2: address.address2,
      city: address.city,
      state_code: address.state,
      country_code: address.country || 'US',
      zip: address.zip,
    };

    const printfulOrder = await createPrintfulOrder(
      recipient,
      printfulItems.map(({ _orderItemId, ...rest }) => rest),
      shippingMethod || 'STANDARD',
      stripePaymentIntentId // Use as external_id for idempotency
    );

    // Save Printful ID immediately so we can recover if confirm fails
    await updatePrintOrderPrintfulId(order.id, printfulOrder.id.toString());

    // Confirm the order for fulfillment
    await confirmOrder(printfulOrder.id);

    return { orderId: order.id, printfulOrderId: printfulOrder.id.toString() };
  } catch (err) {
    console.error('Printful order creation failed:', err);
    // Order stays in 'payment_confirmed' state for manual retry
    try {
      const { sendAdminAlert } = await import('@/lib/email');
      await sendAdminAlert(
        `Print order ${order.id} — Printful submission failed`,
        `Order ID: ${order.id}\nUser ID: ${userId}\nStripe PI: ${stripePaymentIntentId}\nError: ${err instanceof Error ? err.message : String(err)}`
      );
    } catch (alertErr) {
      console.error('Failed to send admin alert:', alertErr);
    }
    return { orderId: order.id };
  }
}
