import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getPrintOrderById, getOrderItems } from '@/lib/db';
import NavbarWrapper from '@/components/NavbarWrapper';
import PrintPurchaseEvent from '@/components/PrintShop/PrintPurchaseEvent';

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const { id } = await params;
  const orderId = parseInt(id);
  if (isNaN(orderId)) redirect('/dashboard');

  const userId = parseInt(session.user.id);
  const order = await getPrintOrderById(orderId, userId);
  if (!order) redirect('/dashboard');

  const items = await getOrderItems(orderId);

  const statusSteps = [
    { key: 'payment_confirmed', label: 'Order placed', date: order.created_at },
    { key: 'submitted_to_printful', label: 'In production', date: order.status !== 'payment_confirmed' ? order.updated_at : null },
    { key: 'shipped', label: 'Shipped', date: order.status === 'shipped' || order.status === 'delivered' ? order.updated_at : null },
    { key: 'delivered', label: 'Delivered', date: order.status === 'delivered' ? order.updated_at : null },
  ];

  const statusOrder = ['payment_confirmed', 'submitted_to_printful', 'in_production', 'shipped', 'delivered'];
  const currentStatusIndex = statusOrder.indexOf(order.status);

  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-peach-50 via-white to-coral-50">
      <NavbarWrapper />
      <Suspense><PrintPurchaseEvent totalCents={order.total_cents} orderId={order.id} /></Suspense>
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Success header */}
        {order.status !== 'failed' && order.status !== 'refunded' && (
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">✅</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {order.status === 'shipped' ? 'Your order is on its way!' :
               order.status === 'delivered' ? 'Your order has arrived!' :
               'Your order is being made!'}
            </h1>
            <p className="text-gray-500">Order #{order.id}</p>
          </div>
        )}

        {order.status === 'failed' || order.status === 'refunded' ? (
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Order Issue</h1>
            <p className="text-gray-500">
              {order.status === 'refunded' ? 'Your order has been refunded.' : 'There was an issue with your order.'}
            </p>
          </div>
        ) : null}

        {/* Timeline */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="space-y-4">
            {statusSteps.map((step, index) => {
              const isCompleted = currentStatusIndex >= index;
              const isCurrent = currentStatusIndex === index;
              const date = formatDate(step.date);

              return (
                <div key={step.key} className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                  }`}>
                    {isCompleted ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${isCurrent ? 'text-gray-900' : isCompleted ? 'text-gray-700' : 'text-gray-400'}`}>
                      {step.label}
                      {step.key === 'shipped' && order.tracking_number && (
                        <span className="text-xs text-gray-500 ml-2">
                          {order.tracking_url ? (
                            <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="text-coral-600 hover:underline">
                              {order.tracking_number}
                            </a>
                          ) : order.tracking_number}
                        </span>
                      )}
                    </div>
                    {date && <div className="text-xs text-gray-400">{date}</div>}
                    {step.key === 'delivered' && !isCompleted && order.estimated_delivery_min && (
                      <div className="text-xs text-gray-400">
                        Est. {formatDate(order.estimated_delivery_min)}
                        {order.estimated_delivery_max && ` – ${formatDate(order.estimated_delivery_max)}`}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order items */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h2>
          <div className="space-y-3 mb-4">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{item.product_type} — {item.product_size}</div>
                  <div className="text-xs text-gray-500">Qty: {item.quantity}</div>
                </div>
                <div className="text-sm font-medium">${(item.unit_price_cents / 100).toFixed(2)}</div>
              </div>
            ))}
          </div>
          <hr className="my-3" />
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>${(order.subtotal_cents / 100).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>${(order.shipping_cents / 100).toFixed(2)}</span></div>
            {order.tax_cents > 0 && (
              <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>${(order.tax_cents / 100).toFixed(2)}</span></div>
            )}
            <hr className="my-2" />
            <div className="flex justify-between font-bold"><span>Total</span><span>${(order.total_cents / 100).toFixed(2)}</span></div>
          </div>
        </div>

        {/* Shipping address */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Ships To</h2>
          <div className="text-sm text-gray-600 space-y-0.5">
            <div>{order.shipping_name}</div>
            <div>{order.shipping_address_1}</div>
            {order.shipping_address_2 && <div>{order.shipping_address_2}</div>}
            <div>{order.shipping_city}, {order.shipping_state} {order.shipping_zip}</div>
            <div>{order.shipping_country}</div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <a
            href="/dashboard"
            className="inline-block px-6 py-3 bg-coral-500 text-white font-semibold rounded-xl hover:bg-coral-600 transition-colors"
          >
            Create More Prints
          </a>
        </div>
      </main>
    </div>
  );
}
