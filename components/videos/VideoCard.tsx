'use client';

import { useState, useEffect, useRef } from 'react';

interface VideoCardProps {
  video: {
    id: number;
    sourceImageUrl: string;
    motionPrompt: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    videoUrl?: string;
    errorMessage?: string;
    createdAt: string;
  };
  onStatusUpdate?: (videoId: number, status: string, videoUrl?: string) => void;
}

export default function VideoCard({ video, onStatusUpdate }: VideoCardProps) {
  const [currentStatus, setCurrentStatus] = useState(video.status);
  const [videoUrl, setVideoUrl] = useState(video.videoUrl);
  const [isPolling, setIsPolling] = useState(video.status === 'processing' || video.status === 'pending');
  const videoRef = useRef<HTMLVideoElement>(null);

  // Poll for status updates
  useEffect(() => {
    if (!isPolling) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/videos/${video.id}`);
        const data = await response.json();

        if (data.status === 'completed') {
          setCurrentStatus('completed');
          setVideoUrl(data.videoUrl);
          setIsPolling(false);
          onStatusUpdate?.(video.id, 'completed', data.videoUrl);
        } else if (data.status === 'failed') {
          setCurrentStatus('failed');
          setIsPolling(false);
          onStatusUpdate?.(video.id, 'failed');
        }
      } catch (err) {
        console.error('Error polling video status:', err);
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(pollInterval);
  }, [isPolling, video.id, onStatusUpdate]);

  const handleDownload = async () => {
    if (!videoUrl) return;

    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video-${video.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      // Fallback: open in new tab
      window.open(videoUrl, '_blank');
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* Video or Status Display */}
      <div className="aspect-square bg-gray-100 relative">
        {currentStatus === 'completed' && videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-cover"
            controls
            loop
            muted
            playsInline
          />
        ) : currentStatus === 'failed' ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <svg className="w-12 h-12 text-red-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-600 text-center">Generation failed</p>
            <p className="text-xs text-gray-500 text-center mt-1">{video.errorMessage || 'Credits refunded'}</p>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            {/* Show source image with overlay */}
            <img
              src={video.sourceImageUrl}
              alt="Source"
              className="absolute inset-0 w-full h-full object-cover opacity-50"
            />
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm font-medium text-gray-700">
                {currentStatus === 'pending' ? 'Queued...' : 'Generating video...'}
              </p>
              <p className="text-xs text-gray-500 mt-1">This may take a few minutes</p>
            </div>
          </div>
        )}
      </div>

      {/* Info and Actions */}
      <div className="p-3">
        <p className="text-xs text-gray-500 truncate" title={video.motionPrompt}>
          {video.motionPrompt}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {new Date(video.createdAt).toLocaleDateString()} at{' '}
          {new Date(video.createdAt).toLocaleTimeString()}
        </p>

        {currentStatus === 'completed' && videoUrl && (
          <button
            onClick={handleDownload}
            className="mt-2 w-full px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>
        )}
      </div>
    </div>
  );
}
