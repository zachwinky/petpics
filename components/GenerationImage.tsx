'use client';

import { useState } from 'react';

// Quality threshold - images below this score get blurred
const QUALITY_THRESHOLD = 0.22;

interface GenerationImageProps {
  url: string;
  alt: string;
  downloadFilename: string;
  qualityScore?: number;
  onAnimateClick?: (imageUrl: string) => void;
  onImageClick?: () => void;
}

export default function GenerationImage({ url, alt, downloadFilename, qualityScore, onAnimateClick, onImageClick }: GenerationImageProps) {
  // Determine if this image is low quality and should be blurred
  const isLowQuality = qualityScore !== undefined && qualityScore < QUALITY_THRESHOLD;
  const [isRevealed, setIsRevealed] = useState(false);

  // Show blur if low quality and not revealed
  const shouldBlur = isLowQuality && !isRevealed;

  return (
    <div className="space-y-2">
      <div className="relative">
        <img
          src={url}
          alt={alt}
          className={`w-full aspect-square object-cover rounded-lg transition-all duration-300 ${
            shouldBlur ? 'blur-lg scale-105' : ''
          } ${onImageClick ? 'md:cursor-default cursor-pointer' : ''}`}
          onClick={() => {
            // Only trigger on mobile (md breakpoint is 768px)
            if (onImageClick && window.innerWidth < 768) {
              onImageClick();
            }
          }}
          onLoad={() => {
            console.log('Dashboard image loaded:', url);
          }}
          onError={(e) => {
            console.error('Dashboard image failed to load:', url);
            console.error('Error event:', e);
            e.currentTarget.style.border = '2px solid red';
          }}
        />
        {/* Blur overlay with reveal button */}
        {shouldBlur && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/30 rounded-lg">
            <button
              onClick={() => setIsRevealed(true)}
              className="px-4 py-2 bg-white/90 backdrop-blur-sm text-gray-700 text-sm font-medium rounded-lg shadow-md hover:bg-white transition-colors"
            >
              Reveal
            </button>
          </div>
        )}
        {/* Low quality indicator badge */}
        {isLowQuality && isRevealed && (
          <div className="absolute top-2 right-2">
            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
              Low match
            </span>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        {/* Download button - hidden on mobile (users can long-press to save) */}
        <a
          href={url}
          download={downloadFilename}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:flex flex-1 text-center justify-center items-center px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Download
        </a>
        {/* Animate button - full width on mobile, auto width on desktop */}
        {onAnimateClick && (
          <button
            onClick={() => onAnimateClick(url)}
            className="flex-1 md:flex-none px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-1"
            title="Create video from this image"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="md:hidden">Animate</span>
          </button>
        )}
      </div>
    </div>
  );
}
