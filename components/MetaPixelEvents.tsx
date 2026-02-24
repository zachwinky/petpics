'use client';

export default function MetaPixelEvents() {
  return null;
}

// --- Print funnel tracking helpers ---

function fbqTrack(event: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', event, params);
  }
}

function fbqTrackCustom(event: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('trackCustom', event, params);
  }
}

/** Studio overlay opened */
export function trackStudioOpened() {
  fbqTrackCustom('StudioOpened');
}

/** 4 scenes selected, generation triggered */
export function trackScenesSelected(sceneCount: number) {
  fbqTrackCustom('ScenesSelected', { sceneCount });
}

/** Final portrait chosen (Step 2 or 3) */
export function trackPortraitSelected() {
  fbqTrackCustom('PortraitSelected');
}

/** Product type chosen in product selector */
export function trackSelectProduct(productType: string, valueCents: number) {
  fbqTrackCustom('SelectProduct', {
    content_type: productType,
    value: valueCents / 100,
    currency: 'USD',
  });
}

/** Item added to cart */
export function trackAddToCart(productType: string, valueCents: number) {
  fbqTrack('AddToCart', {
    content_type: productType,
    value: valueCents / 100,
    currency: 'USD',
  });
}

/** Checkout page loaded */
export function trackBeginCheckout(valueCents: number) {
  fbqTrack('InitiateCheckout', {
    value: valueCents / 100,
    currency: 'USD',
  });
}

/** User rejected all 4 images in Step 2 (favorite pick) */
export function trackRound1Reject() {
  fbqTrackCustom('Round1Reject');
}

/** User rejected all 4 images in Step 3 (refinement) */
export function trackRound2Reject() {
  fbqTrackCustom('Round2Reject');
}

/** Shipping address entered and rates loaded */
export function trackAddShippingInfo() {
  fbqTrack('AddShippingInfo');
}

/** Order placed — fires on order confirmation page */
export function trackPrintPurchase(valueCents: number) {
  fbqTrack('Purchase', {
    value: valueCents / 100,
    currency: 'USD',
  });
}

// --- Google Ads conversion tracking ---

const GOOGLE_ADS_CONVERSION_ID = 'AW-17962222367';
const GOOGLE_ADS_CONVERSION_LABEL = 'RuMPCKyM8fobEJ-Gh_VC';

function gtagEvent(action: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, params);
  }
}

/** Google Ads purchase conversion */
export function trackGoogleAdsPurchase(valueCents: number, orderId?: number) {
  if (!GOOGLE_ADS_CONVERSION_LABEL) return;
  gtagEvent('conversion', {
    send_to: `${GOOGLE_ADS_CONVERSION_ID}/${GOOGLE_ADS_CONVERSION_LABEL}`,
    value: valueCents / 100,
    currency: 'USD',
    transaction_id: orderId ? String(orderId) : '',
  });
}
