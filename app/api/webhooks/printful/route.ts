import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/printful';
import {
  getPrintOrderByPrintfulId, updatePrintOrderStatus,
  getUserById,
} from '@/lib/db';
import { sendOrderShippedEmail } from '@/lib/email';
import { stripe } from '@/lib/stripe';

/**
 * POST /api/webhooks/printful
 *
 * Handles Printful order status webhooks.
 * Events: package_shipped, package_returned, order_failed, order_canceled
 */
export async function POST(req: NextRequest) {
  try {
    const webhookSecret = process.env.PRINTFUL_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('PRINTFUL_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Verify webhook authenticity
    const headerSecret = req.headers.get('x-printful-webhook-secret');
    if (!verifyWebhookSignature(headerSecret, webhookSecret)) {
      return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 });
    }

    const body = await req.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    const printfulOrderId = data.order?.id?.toString();
    if (!printfulOrderId) {
      console.error('No order ID in webhook payload');
      return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
    }

    // Look up our order
    const order = await getPrintOrderByPrintfulId(printfulOrderId);
    if (!order) {
      console.error(`No order found for Printful ID ${printfulOrderId}`);
      // Return 200 to prevent retries for unknown orders
      return NextResponse.json({ received: true });
    }

    switch (type) {
      case 'package_shipped': {
        const shipment = data.shipment;
        const trackingNumber = shipment?.tracking_number;
        const trackingUrl = shipment?.tracking_url;
        const estimatedDelivery = shipment?.estimated_delivery;

        await updatePrintOrderStatus(
          order.id,
          'shipped',
          trackingNumber,
          trackingUrl,
          estimatedDelivery ? new Date(estimatedDelivery) : undefined,
          undefined
        );

        // Send shipped email
        try {
          const user = await getUserById(order.user_id);
          if (user && trackingNumber) {
            await sendOrderShippedEmail(
              user.email,
              user.name || '',
              order.id,
              trackingNumber,
              trackingUrl || '',
            );
          }
        } catch (emailErr) {
          console.error('Failed to send shipped email:', emailErr);
        }

        console.log(`Order ${order.id} shipped. Tracking: ${trackingNumber}`);
        break;
      }

      case 'order_failed': {
        await updatePrintOrderStatus(order.id, 'failed');

        // Trigger refund via Stripe
        try {
          if (order.stripe_payment_intent_id) {
            await stripe.refunds.create({
              payment_intent: order.stripe_payment_intent_id,
              reason: 'requested_by_customer',
            });
            await updatePrintOrderStatus(order.id, 'refunded');
            console.log(`Refund issued for order ${order.id}`);
          }
        } catch (refundErr) {
          console.error('Refund failed for order', order.id, refundErr);
          try {
            const { sendAdminAlert } = await import('@/lib/email');
            await sendAdminAlert(
              `Refund failed for order ${order.id}`,
              `Order ID: ${order.id}\nPrintful ID: ${printfulOrderId}\nStripe PI: ${order.stripe_payment_intent_id}\nError: ${refundErr instanceof Error ? refundErr.message : String(refundErr)}`
            );
          } catch {}
        }

        break;
      }

      case 'order_canceled': {
        await updatePrintOrderStatus(order.id, 'failed');
        console.log(`Order ${order.id} canceled by Printful`);
        break;
      }

      case 'package_returned': {
        console.log(`Order ${order.id} package returned`);
        try {
          const { sendAdminAlert } = await import('@/lib/email');
          await sendAdminAlert(
            `Package returned for order ${order.id}`,
            `Order ID: ${order.id}\nPrintful ID: ${printfulOrderId}\nUser ID: ${order.user_id}\n\nPlease reach out to the customer.`
          );
        } catch {}
        break;
      }

      case 'order_put_hold': {
        console.log(`Order ${order.id} put on hold by Printful`);
        try {
          const { sendAdminAlert } = await import('@/lib/email');
          await sendAdminAlert(
            `Order ${order.id} put on hold by Printful`,
            `Order ID: ${order.id}\nPrintful ID: ${printfulOrderId}\nUser ID: ${order.user_id}\n\nPrintful has put this order on hold (quality issue or address problem). Check the Printful dashboard.`
          );
        } catch {}
        break;
      }

      default:
        console.log(`Unhandled Printful webhook event: ${type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Printful webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
