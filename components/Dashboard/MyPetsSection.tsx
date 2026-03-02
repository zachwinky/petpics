'use client';

import { useState, useEffect, useCallback } from 'react';
import type { StudioModel } from '@/components/Studio/StudioOverlay';
import type { PendingTraining, Model } from '@/lib/db';
import PendingTrainingCard from '@/components/PendingTrainingCard';
import PetUploadSection from './PetUploadSection';
import Link from 'next/link';

type ModelWithCounts = Model & {
  generationCount: number;
  recentImages: string[];
};

interface MyPetsSectionProps {
  models: ModelWithCounts[];
  pendingTrainings: PendingTraining[];
  studioModels: StudioModel[];
  onOpenStudio: (model: StudioModel) => void;
}

export default function MyPetsSection({
  models: initialModels,
  pendingTrainings: initialPending,
  studioModels,
  onOpenStudio,
}: MyPetsSectionProps) {
  const [pendingTrainings, setPendingTrainings] = useState(initialPending);
  const [models, setModels] = useState(initialModels);
  const [showUpload, setShowUpload] = useState(false);

  // Poll pending trainings
  useEffect(() => {
    if (pendingTrainings.length === 0) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/pending-trainings');
        if (!res.ok) return;
        const data = await res.json();
        const stillPending = data.trainings?.filter(
          (t: PendingTraining) => t.status === 'training'
        ) || [];

        if (stillPending.length < pendingTrainings.length) {
          // A training completed — reload to get new model
          window.location.reload();
        }
        setPendingTrainings(stillPending);
      } catch {
        // Ignore polling errors
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [pendingTrainings.length]);

  const handleDelete = useCallback(async (modelId: number) => {
    try {
      const res = await fetch(`/api/models/${modelId}`, { method: 'DELETE' });
      if (res.ok) {
        setModels(prev => prev.filter(m => m.id !== modelId));
      }
    } catch {
      // Ignore
    }
  }, []);

  const handleTrainingStarted = useCallback((training: { id: number; trigger_word: string; images_count: number }) => {
    setPendingTrainings(prev => [...prev, {
      id: training.id,
      user_id: 0,
      fal_request_id: '',
      model_name: training.trigger_word,
      trigger_word: training.trigger_word,
      images_count: training.images_count,
      status: 'training' as const,
      created_at: new Date(),
    }]);
    setShowUpload(false);
  }, []);

  // Empty state: show upload form directly
  if (models.length === 0 && pendingTrainings.length === 0) {
    return (
      <div className="dash-section dash-section-hero" id="my-pets">
        <div className="dash-section-header">
          <div>
            <div className="dash-section-tag">Step 1</div>
            <h2>Upload photos of your pet</h2>
          </div>
        </div>
        <p className="dash-upload-intro">
          Add 5–20 clear photos — different angles, good lighting. Our AI takes about 10 minutes to learn your pet&apos;s unique look, then you&apos;ll pick your favorite portrait and we&apos;ll print it.
        </p>
        <PetUploadSection onTrainingStarted={handleTrainingStarted} />
      </div>
    );
  }

  return (
    <div className="dash-section" id="my-pets">
      <div className="dash-section-header">
        <div>
          <div className="dash-section-tag">My Pets</div>
          <h2>Your Pets</h2>
        </div>
        <button
          className="dash-nav-cta"
          style={{ fontSize: '0.75rem', padding: '6px 14px' }}
          onClick={() => setShowUpload(!showUpload)}
        >
          {showUpload ? 'Cancel' : '+ Add Pet'}
        </button>
      </div>

      {/* Inline upload form */}
      {showUpload && (
        <div style={{ marginBottom: '1.5rem' }}>
          <PetUploadSection
            onTrainingStarted={handleTrainingStarted}
            onCancel={() => setShowUpload(false)}
          />
        </div>
      )}

      <div className="dash-pet-grid">
        {/* Pending trainings first */}
        {pendingTrainings.map(training => (
          <PendingTrainingCard key={training.id} training={training} />
        ))}

        {/* Completed models */}
        {models.map(model => {
          const studioModel = studioModels.find(s => s.id === model.id);
          return (
            <div key={model.id} className="dash-pet-card">
              <div className="dash-pet-card-header">
                <div className="dash-pet-avatar">
                  {model.preview_image_url ? (
                    <img src={model.preview_image_url} alt={model.trigger_word} />
                  ) : (
                    <span style={{ fontSize: '1.2rem' }}>🐾</span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link href={`/dashboard/subjects/${model.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="dash-pet-name">{model.trigger_word}</div>
                  </Link>
                  <div className="dash-pet-meta">
                    {model.generationCount} portrait{model.generationCount !== 1 ? 's' : ''} &middot; {model.training_images_count} training photos
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(model.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--lp-soft-brown)', padding: '4px', fontSize: '1rem', opacity: 0.5,
                  }}
                  title="Delete pet"
                >
                  ✕
                </button>
              </div>
              <div className="dash-pet-actions">
                {studioModel && (
                  <button
                    className="dash-pet-btn dash-pet-btn-primary"
                    onClick={() => onOpenStudio(studioModel)}
                  >
                    Create Portrait
                  </button>
                )}
                <Link
                  href={`/dashboard/subjects/${model.id}`}
                  className="dash-pet-btn dash-pet-btn-secondary"
                >
                  View Gallery
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
