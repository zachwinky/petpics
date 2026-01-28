'use client';

import { useState, useEffect } from 'react';
import GenerationsPanel from './GenerationsPanel';
import VideoGallery from './videos/VideoGallery';

interface Generation {
  id: number;
  image_urls: string[];
  custom_prompt: string | null;
  preset_prompt_id: string | null;
  row_prompts?: string[];
  image_quality_scores?: number[];
  credits_used: number;
  created_at: string;
  reroll_used?: boolean;
  upscale_used?: boolean;
  aspect_ratio?: string;
}

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

interface Model {
  id: number;
  trigger_word: string;
  lora_url: string;
}

interface SubjectDetailContentProps {
  generations: Generation[];
  model: Model;
  initialVideos: Video[];
}

export default function SubjectDetailContent({
  generations,
  model,
  initialVideos,
}: SubjectDetailContentProps) {
  const [activeTab, setActiveTab] = useState<'images' | 'videos'>('images');
  const [videos, setVideos] = useState<Video[]>(initialVideos);
  const [newVideoId, setNewVideoId] = useState<number | null>(null);

  // When a new video is generated, switch to videos tab
  // The useEffect will automatically fetch the updated video list
  const handleVideoGenerated = (videoId: number) => {
    setNewVideoId(videoId);
    // Force a refresh by setting videos to trigger the useEffect
    setVideos([]); // Clear to show loading state briefly
    setActiveTab('videos');
  };

  // Refresh videos when switching to videos tab
  useEffect(() => {
    if (activeTab === 'videos') {
      const fetchVideos = async () => {
        try {
          const response = await fetch(`/api/videos?modelId=${model.id}`);
          if (response.ok) {
            const data = await response.json();
            setVideos(data.videos);
          }
        } catch (err) {
          console.error('Error fetching videos:', err);
        }
      };
      fetchVideos();
    }
  }, [activeTab, model.id]);

  const imageCount = generations.reduce((acc, gen) => acc + gen.image_urls.length, 0);

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('images')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'images'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Product Images ({imageCount})
        </button>
        <button
          onClick={() => setActiveTab('videos')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
            activeTab === 'videos'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Videos ({videos.length})
          {newVideoId && (
            <span className="inline-flex items-center justify-center w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'images' && (
        <GenerationsPanel
          generations={generations}
          model={model}
          onVideoGenerated={handleVideoGenerated}
        />
      )}
      {activeTab === 'videos' && (
        <VideoGallery initialVideos={videos} />
      )}
    </div>
  );
}
