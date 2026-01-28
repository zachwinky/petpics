'use client';

import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with localStorage
const WelcomeModal = dynamic(() => import('./WelcomeModal'), {
  ssr: false,
});

export default function WelcomeModalWrapper() {
  return <WelcomeModal />;
}
