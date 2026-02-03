'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'petpics_photo_guide_collapsed';

export default function PhotoGuide() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check stored preference first
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      // User has a saved preference, use it
      setIsCollapsed(stored === 'true');
    } else {
      // No saved preference - default to collapsed on mobile (< 768px)
      const isMobile = window.innerWidth < 768;
      setIsCollapsed(isMobile);
    }
    setIsLoaded(true);
  }, []);

  const toggleCollapsed = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem(STORAGE_KEY, String(newState));
  };

  // Don't render until we've checked localStorage to avoid flash
  if (!isLoaded) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden mb-6">
      {/* Header - always visible */}
      <button
        onClick={toggleCollapsed}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-blue-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📸</span>
          <span className="font-medium text-blue-900">Tips for Great Results</span>
        </div>
        <svg
          className={`w-5 h-5 text-blue-600 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content - collapsible */}
      {!isCollapsed && (
        <div className="px-4 pb-4 border-t border-blue-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* Do's */}
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-semibold text-green-800">Do</span>
              </div>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span>Take more photos of angles you want generated</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span>Use even, natural lighting</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span>Plain or simple backgrounds</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span>Sharp, in-focus images</span>
                </li>
              </ul>
            </div>

            {/* Don'ts */}
            <div className="bg-white rounded-lg p-4 border border-red-200">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="font-semibold text-red-800">Don't</span>
              </div>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>Blurry or dark photos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>Heavy filters or edits</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>Multiple pets in one photo</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>Busy or cluttered backgrounds</span>
                </li>
              </ul>
            </div>
          </div>

          <p className="text-center text-sm text-blue-700 mt-4">
            The more photos you take of the angles you want, the better your results will be!
          </p>
        </div>
      )}
    </div>
  );
}
