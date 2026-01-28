'use client';

import { useState } from 'react';
import { Model } from '@/lib/db';

interface ModelCardProps {
  model: Model;
  onDelete: (modelId: number) => void;
  onUpdate: (modelId: number, notes: string) => void;
  generationCount?: number;
}

export default function ModelCard({ model, onDelete, onUpdate, generationCount = 0 }: ModelCardProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(model.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/models/${model.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      });

      if (response.ok) {
        setIsEditingNotes(false);
        onUpdate(model.id, notes);
      } else {
        alert('Failed to save notes');
      }
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Failed to save notes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/models/${model.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDelete(model.id);
      } else {
        alert('Failed to delete photo subject');
        setIsDeleting(false);
      }
    } catch (error) {
      console.error('Error deleting model:', error);
      alert('Failed to delete model');
      setIsDeleting(false);
    }
  };

  if (isDeleting) {
    return (
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <div className="flex items-center justify-center py-8">
          <svg className="animate-spin h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="ml-2 text-sm text-gray-600">Deleting...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors cursor-pointer group">
      <a href={`/dashboard/subjects/${model.id}`} className="block">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{model.trigger_word}</h3>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }}
            className="text-red-600 hover:text-red-700 text-sm cursor-pointer z-10"
            title="Delete photo subject"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        {/* Preview Image */}
        {model.preview_image_url && (
          <div className="mb-3">
            <img
              src={model.preview_image_url}
              alt="Preview"
              className="w-full aspect-square object-cover rounded-lg"
            />
          </div>
        )}

        <div className="text-sm text-gray-600 space-y-1 mb-3">
          <div>Training images: {model.training_images_count}</div>
          <div>Pet photos: {generationCount}</div>
          <div>Created: {new Date(model.created_at).toLocaleDateString()}</div>
        </div>
      </a>

      {/* Notes Section */}
      <div className="mb-3">
        {isEditingNotes ? (
          <div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this pet... (e.g., 'Great poses!' or 'Needs more outdoor shots')"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              rows={3}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleSaveNotes}
                disabled={isSaving}
                className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors disabled:bg-gray-400 cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setIsEditingNotes(false);
                  setNotes(model.notes || '');
                }}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            {notes ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{notes}</p>
              </div>
            ) : (
              <div className="text-sm text-gray-400 italic mb-2">
                No notes yet
              </div>
            )}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsEditingNotes(true);
              }}
              className="text-sm text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              {notes ? 'Edit notes' : 'Add notes'}
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Photo Subject?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete <strong>{model.name}</strong>? This will also delete all associated images and pet photos. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
