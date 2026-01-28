'use client';

import { useState } from 'react';

interface AnimateButtonProps {
  imageUrl: string;
  modelId?: number;
  onOpenModal: (imageUrl: string, modelId?: number) => void;
}

export default function AnimateButton({ imageUrl, modelId, onOpenModal }: AnimateButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={() => onOpenModal(imageUrl, modelId)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1.5"
      title="Create a video from this image"
    >
      <svg
        className={`w-4 h-4 ${isHovered ? 'animate-pulse' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      Animate
    </button>
  );
}
