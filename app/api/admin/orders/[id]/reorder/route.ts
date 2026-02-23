import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { getPrintOrderById, getOrderItems, updatePrintOrderPrintfulId } from '@/lib/db';
import { createOrder as createPrintfulOrder, confirmOrder, PrintfulRecipient } from '@/lib/printful';
import { upscaleForPrint } from '@/lib/print-upscale';

export const maxDuration = 60;

/**
 * POST /api/admin/orders/[id]/reorder
 *
 * Creates a NEW Printful order from an existing order's data.
 * Used when the original Printful order failed/was cancelled and the customer
 * needs a replacement. Updates the existing order record with the new Printful ID.
 *
 * Body (optional):
 * {
 *   imageOverrides?: { itemId: number, newImageUrl: string }[]
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const orderId = parseInt(id);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const order = await getPrintOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const allowedStatuses = ['failed', 'refunded', 'payment_confirmed'];
    if (!allowedStatuses.includes(order.status)) {
      return NextResponse.json(
        { error: `Can only reorder from statuses: ${allowedStatuses.join(', ')}. Current: '${order.status}'` },
        { status: 400 }
      );
    }

    const items = await getOrderItems(orderId);
    if (items.length === 0) {
      return NextResponse.json({ error: 'Order has no items' }, { status: 400 });
    }

    // Parse optional image overrides
    let imageOverrides: Record<number, string> = {};
    try {
      const body = await request.json();
      if (body.imageOverrides && Array.isArray(body.imageOverrides)) {
        for (const override of body.imageOverrides) {
          if (override.itemId && override.newImageUrl) {
            imageOverrides[override.itemId] = override.newImageUrl;
          }
        }
      }
    } catch {
      // No body or invalid JSON — use original images
    }

    // Build Printful items
    const printfulItems = [];
    for (const item of items) {
      const sourceUrl = imageOverrides[item.id] || item.image_url;

      // Upscale
      let printReadyUrl = sourceUrl;
      try {
        printReadyUrl = await upscaleForPrint(sourceUrl);
      } catch (err) {
        console.error(`[admin reorder] Upscale failed for item ${item.id}:`, err);
        // Continue with original
      }

      printfulItems.push({
        variant_id: item.printful_variant_id,
        quantity: item.quantity || 1,
        files: [{ url: printReadyUrl }],
      });
    }

    const recipient: PrintfulRecipient = {
      name: order.shipping_name,
      address1: order.shipping_address_1,
      address2: order.shipping_address_2 || undefined,
      city: order.shipping_city,
      state_code: order.shipping_state || undefined,
      country_code: order.shipping_country,
      zip: order.shipping_zip,
    };

    // Use a new external_id to avoid Printful idempotency conflict with original order
    const externalId = `${order.stripe_payment_intent_id}_reorder_${Date.now()}`;

    const printfulOrder = await createPrintfulOrder(
      recipient,
      printfulItems,
      order.shipping_method || 'STANDARD',
      externalId
    );

    // Update order with new Printful ID (sets status to submitted_to_printful)
    await updatePrintOrderPrintfulId(orderId, printfulOrder.id.toString());

    // Confirm
    await confirmOrder(printfulOrder.id);

    return NextResponse.json({
      success: true,
      orderId,
      printfulOrderId: printfulOrder.id,
      externalId,
      imageOverridesApplied: Object.keys(imageOverrides).length,
    });
  } catch (error) {
    console.error('Admin reorder error:', error);
    return NextResponse.json(
      { error: 'Reorder failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
