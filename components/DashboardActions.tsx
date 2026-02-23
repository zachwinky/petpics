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
      {/* When user has no models yet, show prominent Add a Pet CTA */}
      {!hasModels && (
        <a
          href="/"
          className="block w-full px-6 py-4 bg-coral-500 text-white font-semibold rounded-xl hover:bg-coral-600 transition-colors shadow-lg text-center text-lg"
        >
          Add a Pet
        </a>
      )}

      {/* When user has models, show compact secondary actions */}
      {hasModels && (
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/generate"
            className="px-4 py-2 text-sm text-gray-600 font-medium rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
          >
            Create More Portraits
          </a>
          {totalGenerations > 0 && (
            <button
              onClick={() => setIsFrameBuilderOpen(true)}
              className="px-4 py-2 text-sm text-gray-600 font-medium rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
            >
              Create Frame
            </button>
          )}
        </div>
      )}

      {/* Frame Builder Modal */}
      <FrameBuilder
        isOpen={isFrameBuilderOpen}
        onClose={() => setIsFrameBuilderOpen(false)}
      />
    </>
  );
}
