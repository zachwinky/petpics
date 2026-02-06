'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import FramePreview from './FramePreview';
import FrameImagePicker from './FrameImagePicker';
import { LayoutType, FRAME_LAYOUTS } from './frameLayouts';
import { StyleType, FRAME_STYLES } from './frameStyles';
import { useFrameCanvas } from './useFrameCanvas';
import { saveFrame, getSavedFrames, deleteSavedFrame, SavedFrame } from '@/lib/frameStorage';

// Inline SVG Icons
const XIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const ShareIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
);

const SaveIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
);

interface FrameBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  initialImage?: string; // Pre-select an image when opening from "Add to Frame"
}

export default function FrameBuilder({ isOpen, onClose, initialImage }: FrameBuilderProps) {
  const [images, setImages] = useState<(string | null)[]>(() => {
    if (initialImage) {
      return [initialImage, null, null, null];
    }
    return [null, null, null, null];
  });
  const [layout, setLayout] = useState<LayoutType>('2x2');
  const [style, setStyle] = useState<StyleType>('minimal');
  const [savedFrames, setSavedFrames] = useState<SavedFrame[]>(() => getSavedFrames());
  const [showSavedFrames, setShowSavedFrames] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const imagePickerRef = useRef<HTMLDivElement>(null);

  // Detect mobile device
  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  const { canvasRef, exportAsBlob, exportAsDataURL } = useFrameCanvas({
    images,
    layout,
    style,
    size: 1024,
  });

  // Handle image selection
  const handleImageSelect = useCallback((url: string) => {
    setImages(prev => {
      // Find first empty slot
      const emptyIndex = prev.findIndex(img => img === null);
      if (emptyIndex === -1) return prev; // All slots full

      const newImages = [...prev];
      newImages[emptyIndex] = url;
      return newImages;
    });
  }, []);

  // Handle image removal
  const handleImageRemove = useCallback((url: string) => {
    setImages(prev => {
      const index = prev.indexOf(url);
      if (index === -1) return prev;

      const newImages = [...prev];
      newImages[index] = null;
      return newImages;
    });
  }, []);

  // Clear a specific slot
  const handleClearSlot = useCallback((slotIndex: number) => {
    setImages(prev => {
      const newImages = [...prev];
      newImages[slotIndex] = null;
      return newImages;
    });
  }, []);

  // Download frame as PNG
  const handleDownload = useCallback(async () => {
    const blob = await exportAsBlob();
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `petpics-frame-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [exportAsBlob]);

  // Save to photos (mobile) using Web Share API
  const handleSaveToPhotos = useCallback(async () => {
    const blob = await exportAsBlob();
    if (!blob) return;

    const file = new File([blob], `petpics-frame-${Date.now()}.png`, { type: 'image/png' });

    // Check if Web Share API supports file sharing
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Pet Photo Frame' });
        return;
      } catch (e) {
        // User cancelled or share failed
        if ((e as Error).name === 'AbortError') return;
      }
    }
    // Fallback to download
    handleDownload();
  }, [exportAsBlob, handleDownload]);

  // Share to Twitter
  const handleTwitterShare = useCallback(async () => {
    const blob = await exportAsBlob();
    if (!blob) return;

    // For Twitter, we need to download first since we can't directly upload
    // The user will need to attach the image manually
    handleDownload();

    const shareText = encodeURIComponent('Check out my pet photo collage! Made with Petpics');
    const twitterUrl = `https://twitter.com/intent/tweet?text=${shareText}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
    setShareMenuOpen(false);
  }, [exportAsBlob, handleDownload]);

  // Share to Facebook
  const handleFacebookShare = useCallback(async () => {
    handleDownload();
    // Facebook doesn't allow direct image upload via Web Intent
    // User will need to attach manually
    const fbUrl = 'https://www.facebook.com/';
    window.open(fbUrl, '_blank');
    setShareMenuOpen(false);
  }, [handleDownload]);

  // Copy frame to clipboard (for Instagram)
  const handleInstagramShare = useCallback(async () => {
    const blob = await exportAsBlob();
    if (!blob) return;

    try {
      // Try to copy image to clipboard (requires HTTPS and modern browser)
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      // Fallback: just download
      handleDownload();
    }
    setShareMenuOpen(false);
  }, [exportAsBlob, handleDownload]);

  // Save current frame
  const handleSaveFrame = useCallback(() => {
    const nonNullImages = images.filter((img): img is string => img !== null);
    if (nonNullImages.length === 0) return;

    const newFrame: SavedFrame = {
      id: `frame-${Date.now()}`,
      name: `Frame ${savedFrames.length + 1}`,
      images: nonNullImages,
      layout,
      style,
      createdAt: Date.now(),
    };

    saveFrame(newFrame);
    setSavedFrames(getSavedFrames());
  }, [images, layout, style, savedFrames.length]);

  // Load a saved frame
  const handleLoadFrame = useCallback((frame: SavedFrame) => {
    // Pad with nulls to always have 4 slots
    const paddedImages: (string | null)[] = [...frame.images];
    while (paddedImages.length < 4) {
      paddedImages.push(null);
    }
    setImages(paddedImages);
    setLayout(frame.layout);
    setStyle(frame.style);
    setShowSavedFrames(false);
  }, []);

  // Delete a saved frame
  const handleDeleteSavedFrame = useCallback((frameId: string) => {
    deleteSavedFrame(frameId);
    setSavedFrames(getSavedFrames());
  }, []);

  // Scroll to image picker when empty slot is clicked
  const handleEmptySlotClick = useCallback(() => {
    imagePickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  if (!isOpen) return null;

  const hasImages = images.some(img => img !== null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Frame Builder</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Preview Section */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-700">Preview</h3>
              <div className="bg-gray-100 rounded-lg p-4">
                <FramePreview
                  images={images}
                  layout={layout}
                  style={style}
                  size={1024}
                  onEmptySlotClick={handleEmptySlotClick}
                />
                {/* Hidden canvas for export */}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {/* Layout & Style Controls */}
              <div className="flex flex-wrap gap-4">
                {/* Layout selector */}
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-sm font-medium text-gray-600 mb-2">Layout</label>
                  <div className="flex gap-2">
                    {FRAME_LAYOUTS.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => setLayout(l.id)}
                        className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                          layout === l.id
                            ? 'border-coral-500 bg-coral-50 text-coral-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        title={l.description}
                      >
                        {l.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Style selector */}
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-600 mb-2">Style</label>
                  <div className="flex gap-2">
                    {FRAME_STYLES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setStyle(s.id)}
                        className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                          style === s.id
                            ? 'border-coral-500 bg-coral-50 text-coral-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        title={s.description}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Image Selection Section */}
            <div ref={imagePickerRef} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-700">Select Images</h3>
                {savedFrames.length > 0 && (
                  <button
                    onClick={() => setShowSavedFrames(!showSavedFrames)}
                    className="text-sm text-coral-600 hover:text-coral-700"
                  >
                    {showSavedFrames ? 'Hide Saved' : `Saved (${savedFrames.length})`}
                  </button>
                )}
              </div>

              {/* Saved Frames */}
              {showSavedFrames && savedFrames.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <p className="text-sm text-gray-600">Your saved frames:</p>
                  <div className="flex gap-2 flex-wrap">
                    {savedFrames.map((frame) => (
                      <div
                        key={frame.id}
                        className="relative group"
                      >
                        <button
                          onClick={() => handleLoadFrame(frame)}
                          className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:border-coral-300 transition-colors"
                        >
                          {frame.name}
                        </button>
                        <button
                          onClick={() => handleDeleteSavedFrame(frame.id)}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Image Picker */}
              <FrameImagePicker
                selectedImages={images}
                onImageSelect={handleImageSelect}
                onImageRemove={handleImageRemove}
                maxImages={4}
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleSaveFrame}
            disabled={!hasImages}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <SaveIcon />
            Save Frame
          </button>

          <div className="flex items-center gap-3">
            {/* Share dropdown */}
            <div className="relative">
              <button
                onClick={() => setShareMenuOpen(!shareMenuOpen)}
                disabled={!hasImages}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ShareIcon />
                Share
              </button>

              {shareMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShareMenuOpen(false)} />
                  <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <button
                      onClick={handleTwitterShare}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      Share on X
                    </button>
                    <button
                      onClick={handleFacebookShare}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      Share on Facebook
                    </button>
                    <button
                      onClick={handleInstagramShare}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                      Copy for Instagram
                    </button>
                  </div>
                </>
              )}

              {copySuccess && (
                <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg">
                  Copied to clipboard!
                </div>
              )}
            </div>

            {/* Download/Save button - changes based on mobile */}
            <button
              onClick={isMobile ? handleSaveToPhotos : handleDownload}
              disabled={!hasImages}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-coral-500 rounded-lg hover:bg-coral-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <DownloadIcon />
              {isMobile ? 'Save to Photos' : 'Download PNG'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
