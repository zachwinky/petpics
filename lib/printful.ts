const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
const PRINTFUL_BASE_URL = 'https://api.printful.com';

// ========================================
// Types
// ========================================

export interface PrintfulRecipient {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state_code?: string;
  country_code: string;
  zip: string;
}

export interface PrintfulOrderItem {
  variant_id: number;
  quantity: number;
  files: { url: string }[];
}

export interface PrintfulOrder {
  id: number;
  external_id?: string;
  status: string;
  shipping: string;
  created: number;
  updated: number;
  recipient: PrintfulRecipient;
  items: PrintfulOrderItem[];
  shipments?: PrintfulShipment[];
}

export interface PrintfulShipment {
  id: number;
  carrier: string;
  service: string;
  tracking_number: string;
  tracking_url: string;
  created: number;
  ship_date: string;
  estimated_delivery: string;
}

export interface PrintfulFile {
  id: number;
  type: string;
  hash: string;
  url: string;
  filename: string;
  size: number;
  width: number;
  height: number;
  status: string;
}

export interface PrintfulShippingRate {
  id: string;
  name: string;
  rate: string; // price as string like "4.99"
  currency: string;
  minDeliveryDays: number;
  maxDeliveryDays: number;
  minDeliveryDate: string;
  maxDeliveryDate: string;
}

export interface PrintfulMockupResult {
  status: string;
  mockups: { placement: string; variant_ids: number[]; mockup_url: string }[];
}

// ========================================
// API Client
// ========================================

async function printfulFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  if (!PRINTFUL_API_KEY) {
    throw new Error('PRINTFUL_API_KEY environment variable is not set');
  }

  const url = `${PRINTFUL_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Retry once on 5xx errors
  if (response.status >= 500 && response.status < 600) {
    console.warn(`Printful API returned ${response.status}, retrying once...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const retryResponse = await fetch(url, { ...options, headers });
    return retryResponse;
  }

  return response;
}

async function printfulRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await printfulFetch(path, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Printful API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.result as T;
}

// ========================================
// File Operations
// ========================================

/**
 * Upload a file to Printful by providing a URL.
 * Printful will download the image from the URL.
 */
export async function uploadFile(imageUrl: string, filename?: string): Promise<PrintfulFile> {
  return printfulRequest<PrintfulFile>('/files', {
    method: 'POST',
    body: JSON.stringify({
      url: imageUrl,
      filename: filename || 'pet-portrait.png',
    }),
  });
}

// ========================================
// Shipping Operations
// ========================================

/**
 * Get shipping rates for a given address and set of items.
 */
export async function getShippingRates(
  recipient: PrintfulRecipient,
  items: { variant_id: number; quantity: number }[]
): Promise<PrintfulShippingRate[]> {
  const result = await printfulRequest<PrintfulShippingRate[]>('/shipping/rates', {
    method: 'POST',
    body: JSON.stringify({
      recipient,
      items,
    }),
  });
  return result;
}

// ========================================
// Order Operations
// ========================================

/**
 * Create an order on Printful.
 * Uses the stripe payment intent ID as an external_id for idempotency.
 */
export async function createOrder(
  recipient: PrintfulRecipient,
  items: PrintfulOrderItem[],
  shipping: string,
  externalId: string
): Promise<PrintfulOrder> {
  return printfulRequest<PrintfulOrder>('/orders', {
    method: 'POST',
    body: JSON.stringify({
      external_id: externalId,
      recipient,
      items,
      shipping,
    }),
  });
}

/**
 * Confirm a draft order for fulfillment.
 */
export async function confirmOrder(orderId: number): Promise<PrintfulOrder> {
  return printfulRequest<PrintfulOrder>(`/orders/${orderId}/confirm`, {
    method: 'POST',
  });
}

/**
 * Get order details by Printful order ID.
 */
export async function getOrder(orderId: number): Promise<PrintfulOrder> {
  return printfulRequest<PrintfulOrder>(`/orders/${orderId}`);
}

/**
 * Get order details by external ID (stripe payment intent ID).
 */
export async function getOrderByExternalId(externalId: string): Promise<PrintfulOrder> {
  return printfulRequest<PrintfulOrder>(`/orders/@${externalId}`);
}

// ========================================
// Mockup Operations
// ========================================

/**
 * Create a mockup generation task.
 * Returns a task_key to poll for the result.
 */
export async function createMockupTask(
  productId: number,
  imageUrl: string,
  variantIds?: number[]
): Promise<string> {
  const body: Record<string, unknown> = {
    files: [
      {
        placement: 'default',
        image_url: imageUrl,
      },
    ],
  };

  if (variantIds && variantIds.length > 0) {
    body.variant_ids = variantIds;
  }

  const result = await printfulRequest<{ task_key: string }>(
    `/mockup-generator/create-task/${productId}`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  );

  return result.task_key;
}

/**
 * Poll for mockup generation result.
 * Returns null if still pending.
 */
export async function getMockupResult(taskKey: string): Promise<PrintfulMockupResult | null> {
  const response = await printfulFetch(`/mockup-generator/task?task_key=${taskKey}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Printful mockup task error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const result = data.result;

  if (result.status === 'completed') {
    return result as PrintfulMockupResult;
  }

  // Still pending
  return null;
}

/**
 * Generate a mockup and wait for the result (with timeout).
 * Polls every 2 seconds, times out after maxWaitMs.
 */
export async function generateMockup(
  productId: number,
  imageUrl: string,
  variantIds?: number[],
  maxWaitMs: number = 30000
): Promise<PrintfulMockupResult | null> {
  const taskKey = await createMockupTask(productId, imageUrl, variantIds);

  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const result = await getMockupResult(taskKey);
    if (result) return result;
  }

  // Timed out
  return null;
}

// ========================================
// Webhook Verification
// ========================================

/**
 * Verify a Printful webhook request.
 * Printful sends a webhook secret in the X-Printful-Webhook-Secret header.
 */
export function verifyWebhookSignature(
  headerSecret: string | null,
  expectedSecret: string
): boolean {
  if (!headerSecret || !expectedSecret) return false;
  return headerSecret === expectedSecret;
}
