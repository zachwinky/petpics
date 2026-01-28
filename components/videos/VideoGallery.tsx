'use client';

import { useState } from 'react';
import VideoCard from './VideoCard';

interface Video {
  id: number;
  modelId?: number;
  sourceImageUrl: string;
  motionPrompt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  errorMessage?: string;
  creditsUsed: number;
  createdAt: string;
  completedAt?: string;
}

interface VideoGalleryProps {
  initialVideos: Video[];
}

export default function VideoGallery({ initialVideos }: VideoGalleryProps) {
  const [videos, setVideos] = useState<Video[]>(initialVideos);

  const handleStatusUpdate = (videoId: number, status: string, videoUrl?: string) => {
    setVideos(prev =>
      prev.map(v =>
        v.id === videoId
          ? { ...v, status: status as Video['status'], videoUrl }
          : v
      )
    );
  };

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎬</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No videos yet</h3>
        <p className="text-gray-600">
          Click &quot;Animate&quot; on any product image to create a video
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {videos.map((video) => (
        <VideoCard
          key={video.id}
          video={video}
          onStatusUpdate={handleStatusUpdate}
        />
      ))}
    </div>
  );
}
