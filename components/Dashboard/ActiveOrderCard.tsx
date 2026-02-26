'use client';

import Link from 'next/link';
import type { PrintOrder, PrintOrderItem } from '@/lib/db';
import { ORDER_STATUS_CONFIG, ORDER_STEPS, getOrderCTA, formatOrderDate, formatCents } from '@/lib/orderUtils';

interface ActiveOrderCardProps {
  order: PrintOrder;
  items: PrintOrderItem[];
}

export default function ActiveOrderCard({ order, items }: ActiveOrderCardProps) {
  const statusConfig = ORDER_STATUS_CONFIG[order.status];
  const cta = getOrderCTA(order.status, order.id);
  const firstItem = items[0];
  const productLabel = firstItem
    ? firstItem.product_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : 'Print Order';

  return (
    <Link href={cta.href} className="dash-order-card">
      {/* Thumbnail */}
      <div className="dash-order-thumb">
        {firstItem?.image_url ? (
          <img src={firstItem.image_url} alt="Order preview" />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
            🖼️
          </div>
        )}
      </div>

      {/* Info */}
      <div className="dash-order-info">
        <div className="dash-order-type">{productLabel}</div>
        <div className="dash-order-status" style={{ color: statusConfig.color }}>
          {statusConfig.label}
        </div>
        <div className="dash-order-date">
          {formatOrderDate(order.created_at)} &middot; {formatCents(order.total_cents)}
        </div>

        {/* Status dots */}
        <div className="dash-status-steps">
          {ORDER_STEPS.map((step, i) => (
            <span key={step}>
              {i > 0 && (
                <span
                  className={`dash-status-line${i <= statusConfig.stepIndex ? ' active' : ''}`}
                  style={{ display: 'inline-block' }}
                />
              )}
              <span
                className={`dash-status-dot${
                  i < statusConfig.stepIndex ? ' active' : ''
                }${i === statusConfig.stepIndex ? ' current' : ''}`}
                title={step}
              />
            </span>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="dash-order-cta">{cta.text} →</div>
    </Link>
  );
}
