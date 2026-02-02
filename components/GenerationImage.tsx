'use client';

import { useState } from 'react';

// Quality threshold - images below this score get blurred
const QUALITY_THRESHOLD = 0.22;

// Normalize pet name: "MAX" or "mAx" -> "Max"
const formatPetName = (name: string) =>
  name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

interface GenerationImageProps {
  url: string;
  alt: string;
  downloadFilename: string;
  qualityScore?: number;
  petName?: string;
  onAnimateClick?: (imageUrl: string) => void;
  onImageClick?: () => void;
  onAddToFrame?: (imageUrl: string) => void;
}

export default function GenerationImage({ url, alt, downloadFilename, qualityScore, petName, onAnimateClick, onImageClick, onAddToFrame }: GenerationImageProps) {
  // Determine if this image is low quality and should be blurred
  const isLowQuality = qualityScore !== undefined && qualityScore < QUALITY_THRESHOLD;
  const [isRevealed, setIsRevealed] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Show blur if low quality and not revealed
  const shouldBlur = isLowQuality && !isRevealed;

  // Share text with pet name
  const formattedName = petName ? formatPetName(petName) : 'my pet';
  const shareText = `🐾 Check out this AI photo of ${formattedName}! Made with Petpics ✨\n\n#petphotography #aipets #dogsofinstagram`;
  const shareUrl = url;

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
    setShareMenuOpen(false);
  };

  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(facebookUrl, '_blank', 'width=550,height=420');
    setShareMenuOpen(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
    setShareMenuOpen(false);
  };

  const handleInstagramShare = async () => {
    // Copy caption to clipboard, then user can paste in Instagram
    try {
      await navigator.clipboard.writeText(shareText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      // Trigger download so user has the image
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadFilename;
      link.click();
    } catch (err) {
      console.error('Failed to copy:', err);
    }
    setShareMenuOpen(false);
  };

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
        {/* Copy success toast */}
        {copySuccess && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-lg">
            Copied!
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
          className="hidden md:flex flex-1 text-center justify-center items-center px-3 py-2 bg-coral-500 text-white text-sm font-medium rounded-lg hover:bg-coral-600 transition-colors"
        >
          Download
        </a>

        {/* Share button with dropdown */}
        <div className="relative">
          <button
            onClick={() => setShareMenuOpen(!shareMenuOpen)}
            className="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
            title="Share this photo"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span className="hidden md:inline">Share</span>
          </button>

          {/* Share dropdown menu */}
          {shareMenuOpen && (
            <>
              {/* Backdrop to close menu */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShareMenuOpen(false)}
              />
              <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                <button
                  onClick={handleTwitterShare}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Share on X
                </button>
                <button
                  onClick={handleFacebookShare}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Share on Facebook
                </button>
                <button
                  onClick={handleInstagramShare}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                  Download for Instagram
                </button>
                {onAddToFrame && (
                  <>
                    <hr className="my-1" />
                    <button
                      onClick={() => {
                        onAddToFrame(url);
                        setShareMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-coral-600 hover:bg-coral-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Add to Frame
                    </button>
                  </>
                )}
                <hr className="my-1" />
                <button
                  onClick={handleCopyLink}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Link
                </button>
              </div>
            </>
          )}
        </div>

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
