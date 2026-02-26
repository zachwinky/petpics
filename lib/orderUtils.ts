import type { PrintOrderStatus } from './db';

interface StatusConfig {
  label: string;
  color: string;
  stepIndex: number; // 0-3 for the 4-step progress indicator
}

export const ORDER_STATUS_CONFIG: Record<PrintOrderStatus, StatusConfig> = {
  payment_confirmed: { label: 'Order Placed', color: '#8BA888', stepIndex: 0 },
  submitted_to_printful: { label: 'In Production', color: '#C4A76C', stepIndex: 1 },
  in_production: { label: 'Being Printed', color: '#C4A76C', stepIndex: 1 },
  shipped: { label: 'On Its Way', color: '#E8845C', stepIndex: 2 },
  delivered: { label: 'Delivered', color: '#8BA888', stepIndex: 3 },
  failed: { label: 'Issue', color: '#cc4a4a', stepIndex: -1 },
  refunded: { label: 'Refunded', color: '#8B7355', stepIndex: -1 },
};

export const ORDER_STEPS = ['Placed', 'Production', 'Shipped', 'Delivered'] as const;

export function getOrderProgress(status: PrintOrderStatus): number {
  const config = ORDER_STATUS_CONFIG[status];
  if (config.stepIndex < 0) return 0;
  return Math.round((config.stepIndex / 3) * 100);
}

export function getOrderCTA(status: PrintOrderStatus, orderId: number): { text: string; href: string } {
  switch (status) {
    case 'shipped':
      return { text: 'Track Order', href: `/print/order/${orderId}` };
    case 'delivered':
      return { text: 'View Order', href: `/print/order/${orderId}` };
    default:
      return { text: 'View Details', href: `/print/order/${orderId}` };
  }
}

export function formatOrderDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatCents(cents: number): string {
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}
