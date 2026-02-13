interface FacebookPixelEvent {
  (command: 'init', pixelId: string): void;
  (command: 'track', eventName: string, params?: Record<string, unknown>): void;
  (command: 'trackCustom', eventName: string, params?: Record<string, unknown>): void;
}

interface Window {
  fbq: FacebookPixelEvent;
}
