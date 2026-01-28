'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface CameraCaptureProps {
  onPhotosCapture: (photos: File[]) => void;
  onClose: () => void;
  maxPhotos?: number;
}

interface CapturedPhoto {
  dataUrl: string;
  file: File;
}

export default function CameraCapture({ onPhotosCapture, onClose, maxPhotos = 20 }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const photoStripRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [showGuidelines, setShowGuidelines] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  // Start camera stream
  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Camera access error:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera access denied. Please allow camera permissions to use this feature.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.');
        } else {
          setError('Unable to access camera. Please try again.');
        }
      }
      setIsLoading(false);
    }
  }, [facingMode]);

  // Initialize camera on mount
  useEffect(() => {
    startCamera();

    // Cleanup on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]);

  // Switch between front and back camera
  const switchCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // Capture photo from video stream
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    if (capturedPhotos.length >= maxPhotos) {
      setError(`Maximum ${maxPhotos} photos reached`);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    // Convert to File
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File(
          [blob],
          `photo-${Date.now()}.jpg`,
          { type: 'image/jpeg' }
        );

        setCapturedPhotos(prev => [...prev, { dataUrl, file }]);

        // Auto-scroll to show the newest photo
        setTimeout(() => {
          if (photoStripRef.current) {
            photoStripRef.current.scrollTo({
              left: photoStripRef.current.scrollWidth,
              behavior: 'smooth'
            });
          }
        }, 50);
      }
    }, 'image/jpeg', 0.9);
  }, [capturedPhotos.length, maxPhotos]);

  // Remove a captured photo
  const removePhoto = (index: number) => {
    setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Submit all captured photos
  const handleDone = () => {
    const files = capturedPhotos.map(p => p.file);
    onPhotosCapture(files);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col h-screen h-[100dvh] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80">
        <button
          onClick={onClose}
          className="text-white text-sm font-medium px-3 py-1"
        >
          Cancel
        </button>
        <div className="text-white text-sm">
          {capturedPhotos.length} / {maxPhotos} photos
        </div>
        <button
          onClick={() => setShowGuidelines(!showGuidelines)}
          className={`text-sm font-medium px-3 py-1 ${showGuidelines ? 'text-indigo-400' : 'text-white/60'}`}
        >
          Grid
        </button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 p-6">
            <div className="text-center">
              <p className="text-white mb-4">{error}</p>
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {/* Guidelines Overlay */}
        {showGuidelines && !isLoading && !error && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Rule of thirds grid */}
            <div className="absolute inset-0">
              {/* Vertical lines */}
              <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30"></div>
              <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30"></div>
              {/* Horizontal lines */}
              <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30"></div>
              <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30"></div>
            </div>

            {/* Center focus area */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-white/40 rounded-lg"></div>
            </div>

            {/* Tips */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-black/60 rounded-lg px-3 py-2 text-center">
                <p className="text-white/80 text-xs">
                  Center your pet • Use good lighting • Keep steady
                </p>
                <p className="text-indigo-300 text-xs mt-1">
                  Tip: Take more photos of angles you&apos;d like to see generated more frequently
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Captured Photos Strip */}
      {capturedPhotos.length > 0 && (
        <div className="bg-black/90 px-4 py-2">
          <div ref={photoStripRef} className="flex gap-2 overflow-x-auto pb-2">
            {capturedPhotos.map((photo, index) => (
              <div key={index} className="relative flex-shrink-0">
                <img
                  src={photo.dataUrl}
                  alt={`Captured ${index + 1}`}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <button
                  onClick={() => removePhoto(index)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center"
                >
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-black px-4 py-6 safe-area-bottom">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {/* Switch Camera Button */}
          <button
            onClick={switchCamera}
            className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center"
            disabled={isLoading}
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Capture Button */}
          <button
            onClick={capturePhoto}
            disabled={isLoading || !!error || capturedPhotos.length >= maxPhotos}
            className="w-20 h-20 rounded-full bg-white flex items-center justify-center disabled:opacity-50"
          >
            <div className="w-16 h-16 rounded-full border-4 border-gray-900"></div>
          </button>

          {/* Done Button */}
          <button
            onClick={handleDone}
            disabled={capturedPhotos.length === 0}
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              capturedPhotos.length > 0 ? 'bg-indigo-600' : 'bg-white/20'
            }`}
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>

        {/* Photo count hint */}
        <p className="text-center text-white/60 text-xs mt-3">
          Tap the button to capture • {capturedPhotos.length > 0 ? 'Tap ✓ when done' : 'Take at least 5 photos'}
        </p>
      </div>
    </div>
  );
}
