'use client';

import { useState, useEffect, useCallback } from 'react';
import { Model, PendingTraining } from '@/lib/db';
import ModelCard from './ModelCard';
import PendingTrainingCard from './PendingTrainingCard';

interface ModelWithCount extends Model {
  generationCount?: number;
}

interface ModelsGridProps {
  initialModels: ModelWithCount[];
  initialPendingTrainings?: PendingTraining[];
}

export default function ModelsGrid({ initialModels, initialPendingTrainings = [] }: ModelsGridProps) {
  const [models, setModels] = useState(initialModels);
  const [pendingTrainings, setPendingTrainings] = useState(initialPendingTrainings);

  // Poll for pending training updates
  const checkPendingTrainings = useCallback(async () => {
    try {
      const res = await fetch('/api/pending-trainings');
      if (res.ok) {
        const { pendingTrainings: updated } = await res.json();

        // If a training completed (fewer pending now), refresh the page to get new model
        if (updated.length < pendingTrainings.length) {
          window.location.reload();
          return;
        }

        setPendingTrainings(updated);
      }
    } catch (error) {
      console.error('Error checking pending trainings:', error);
    }
  }, [pendingTrainings.length]);

  useEffect(() => {
    // Only poll if there are pending trainings
    if (pendingTrainings.length === 0) return;

    // Poll every 30 seconds
    const interval = setInterval(checkPendingTrainings, 30000);

    return () => clearInterval(interval);
  }, [pendingTrainings.length, checkPendingTrainings]);

  const handleDelete = (modelId: number) => {
    setModels(models.filter(m => m.id !== modelId));
  };

  const handleUpdate = (modelId: number, notes: string) => {
    setModels(models.map(m =>
      m.id === modelId ? { ...m, notes } : m
    ));
  };

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Pending trainings first */}
      {pendingTrainings.map((training) => (
        <PendingTrainingCard key={`pending-${training.id}`} training={training} />
      ))}

      {/* Then completed models */}
      {models.map((model) => (
        <ModelCard
          key={model.id}
          model={model}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
          generationCount={model.generationCount}
        />
      ))}
    </div>
  );
}
