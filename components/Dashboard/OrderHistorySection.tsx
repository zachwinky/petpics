'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { PrintOrder, PrintOrderItem } from '@/lib/db';
import { ORDER_STATUS_CONFIG, formatOrderDate, formatCents } from '@/lib/orderUtils';

interface OrderHistorySectionProps {
  orders: PrintOrder[];
  orderItemsMap: Record<number, PrintOrderItem[]>;
}

export default function OrderHistorySection({ orders, orderItemsMap }: OrderHistorySectionProps) {
  const [showAll, setShowAll] = useState(false);
  const displayOrders = showAll ? orders : orders.slice(0, 3);

  if (orders.length === 0) return null;

  return (
    <div className="dash-section">
      <div className="dash-section-header">
        <div>
          <div className="dash-section-tag">Order History</div>
          <h2>Past Orders</h2>
        </div>
      </div>

      <div className="dash-card" style={{ padding: '4px 16px' }}>
        {displayOrders.map(order => {
          const items = orderItemsMap[order.id] || [];
          const firstItem = items[0];
          const statusConfig = ORDER_STATUS_CONFIG[order.status];
          const productLabel = firstItem
            ? firstItem.product_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
            : 'Print';

          return (
            <div key={order.id} className="dash-history-item">
              <div className="dash-history-thumb">
                {firstItem?.image_url ? (
                  <img src={firstItem.image_url} alt="Order" />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                    🖼️
                  </div>
                )}
              </div>
              <div className="dash-history-info">
                <div className="dash-history-type">
                  {productLabel} &middot; <span style={{ color: statusConfig.color }}>{statusConfig.label}</span>
                </div>
                <div className="dash-history-date">{formatOrderDate(order.created_at)}</div>
              </div>
              <div className="dash-history-total">{formatCents(order.total_cents)}</div>
              <div className="dash-history-actions">
                <Link href={`/print/order/${order.id}`} className="dash-history-btn dash-history-btn-secondary">
                  Details
                </Link>
                {firstItem?.image_url && (
                  <Link
                    href={`/print/configure?image=${encodeURIComponent(firstItem.image_url)}&productType=${encodeURIComponent(firstItem.product_type)}`}
                    className="dash-history-btn dash-history-btn-primary"
                  >
                    Reorder
                  </Link>
                )}
              </div>
            </div>
          );
        })}

        {!showAll && orders.length > 3 && (
          <button className="dash-show-more" onClick={() => setShowAll(true)}>
            Show all {orders.length} orders
          </button>
        )}
      </div>
    </div>
  );
}
