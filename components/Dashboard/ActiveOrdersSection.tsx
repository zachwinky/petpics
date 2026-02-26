'use client';

import type { PrintOrder, PrintOrderItem } from '@/lib/db';
import ActiveOrderCard from './ActiveOrderCard';
import Link from 'next/link';

interface ActiveOrdersSectionProps {
  orders: PrintOrder[];
  orderItemsMap: Record<number, PrintOrderItem[]>;
}

export default function ActiveOrdersSection({ orders, orderItemsMap }: ActiveOrdersSectionProps) {
  return (
    <div className="dash-section">
      <div className="dash-section-header">
        <div>
          <div className="dash-section-tag">Your Orders</div>
          <h2>{orders.length > 0 ? `${orders.length} Active Order${orders.length > 1 ? 's' : ''}` : 'Your Orders'}</h2>
        </div>
      </div>

      {orders.length > 0 ? (
        <div>
          {orders.map(order => (
            <ActiveOrderCard
              key={order.id}
              order={order}
              items={orderItemsMap[order.id] || []}
            />
          ))}
        </div>
      ) : (
        <div className="dash-empty">
          <div className="dash-empty-icon">📦</div>
          <h3>No orders yet</h3>
          <p>Pick a product, upload a few photos of your pet, and we&apos;ll create a custom portrait for you.</p>
          <Link href="/#products" className="dash-empty-cta">
            Start Your First Order
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14m-7-7 7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
