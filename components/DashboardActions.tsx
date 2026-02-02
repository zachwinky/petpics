'use client';

import { useState } from 'react';
import { FrameBuilder } from './FrameBuilder';

interface DashboardActionsProps {
  hasModels: boolean;
  totalGenerations: number;
}

export default function DashboardActions({ hasModels, totalGenerations }: DashboardActionsProps) {
  const [isFrameBuilderOpen, setIsFrameBuilderOpen] = useState(false);

  return (
    <>
      {/* Primary Actions */}
      <div className="space-y-4">
        {/* Train New Model */}
        <a
          href="/"
          className="block w-full px-6 py-4 bg-coral-500 text-white font-semibold rounded-xl hover:bg-coral-600 transition-colors shadow-lg text-center text-lg"
        >
          Add a Pet
        </a>

        {/* Generate from Existing Models */}
        {hasModels && (
          <a
            href="/generate"
            className="block w-full px-6 py-4 bg-peach-500 text-white font-semibold rounded-xl hover:bg-peach-600 transition-colors shadow-lg text-center text-lg"
          >
            Create Photos
          </a>
        )}

        {/* Frame Builder - Only show if user has generations */}
        {totalGenerations > 0 && (
          <button
            onClick={() => setIsFrameBuilderOpen(true)}
            className="block w-full px-6 py-4 bg-white text-coral-600 font-semibold rounded-xl hover:bg-coral-50 transition-colors shadow-md border-2 border-coral-200 text-center text-lg"
          >
            Create Frame
          </button>
        )}
      </div>

      {/* Frame Builder Modal */}
      <FrameBuilder
        isOpen={isFrameBuilderOpen}
        onClose={() => setIsFrameBuilderOpen(false)}
      />
    </>
  );
}
