'use client';

import { useEffect, useState } from 'react';
import { PendingTraining } from '@/lib/db';

interface PendingTrainingCardProps {
  training: PendingTraining;
}

export default function PendingTrainingCard({ training }: PendingTrainingCardProps) {
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  useEffect(() => {
    const updateElapsed = () => {
      const elapsed = Math.floor((Date.now() - new Date(training.created_at).getTime()) / 60000);
      setElapsedMinutes(elapsed);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [training.created_at]);

  return (
    <div className="bg-white rounded-xl shadow-md border-2 border-amber-200 overflow-hidden">
      {/* Animated gradient header */}
      <div className="h-32 bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100 flex items-center justify-center relative overflow-hidden">
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />

        <div className="text-center relative z-10">
          <div className="h-10 w-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-amber-700 font-semibold">Training...</p>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 truncate text-lg">{training.trigger_word}</h3>
        <p className="text-sm text-gray-500 mt-1">{training.images_count} training images</p>

        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-sm text-amber-600 font-medium">
            {elapsedMinutes < 1 ? 'Started just now' : `Started ${elapsedMinutes} min ago`}
          </p>
          <p className="text-xs text-gray-400 mt-1">Usually takes about 10 minutes</p>
        </div>

        {/* Progress indication */}
        <div className="mt-3">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full animate-pulse"
              style={{ width: `${Math.min(90, Math.max(10, elapsedMinutes * 6))}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
