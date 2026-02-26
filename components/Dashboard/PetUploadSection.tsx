'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAuthModal } from '@/lib/auth-context';

const CameraCapture = dynamic(() => import('../CameraCapture'), { ssr: false });

interface SelectedImage {
  file: File;
  preview: string;
}

interface PetUploadSectionProps {
  onTrainingStarted: (training: { id: number; trigger_word: string; images_count: number }) => void;
  onCancel?: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/heic', 'image/heif'];
const MAX_FILES = 20;
const MIN_FILES = 5;

export default function PetUploadSection({ onTrainingStarted, onCancel }: PetUploadSectionProps) {
  const [selectedFiles, setSelectedFiles] = useState<SelectedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [petName, setPetName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stage, setStage] = useState<'idle' | 'uploading' | 'training'>('idle');
  const [showCamera, setShowCamera] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleTrainRef = useRef<() => void>(() => {});
  const { showAuthModal } = useAuthModal();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Restore cached images after OAuth redirect
  useEffect(() => {
    const restoreCachedImages = async () => {
      const cached = localStorage.getItem('pendingUploadImages');
      const cachedName = localStorage.getItem('pendingTriggerWord');
      if (cached) {
        try {
          const previews: string[] = JSON.parse(cached);
          const restoredFiles: SelectedImage[] = await Promise.all(
            previews.map(async (preview, index) => {
              const response = await fetch(preview);
              const blob = await response.blob();
              const file = new File([blob], `restored-image-${index}.jpg`, { type: 'image/jpeg' });
              return { file, preview };
            })
          );
          setSelectedFiles(restoredFiles);
          localStorage.removeItem('pendingUploadImages');
        } catch {
          localStorage.removeItem('pendingUploadImages');
        }
      }
      if (cachedName) {
        setPetName(cachedName);
        localStorage.removeItem('pendingTriggerWord');
      }
    };
    restoreCachedImages();
  }, []);

  const isHeicFile = (file: File): boolean => {
    if (['image/heic', 'image/heif'].includes(file.type)) return true;
    const ext = file.name.toLowerCase().split('.').pop();
    return ext === 'heic' || ext === 'heif';
  };

  const convertHeicToJpeg = async (file: File): Promise<File> => {
    const heic2any = (await import('heic2any')).default;
    const convertedBlob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
    const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
    return new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
  };

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX = 1024;
          if (width > height) {
            if (width > MAX) { height *= MAX / width; width = MAX; }
          } else {
            if (height > MAX) { width *= MAX / height; height = MAX; }
          }
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => resolve(blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file),
            'image/jpeg',
            0.80
          );
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFilesSelect = useCallback(async (files: FileList) => {
    const newFiles: SelectedImage[] = [];
    let processingCount = 0;
    const totalToProcess = Math.min(files.length, MAX_FILES - selectedFiles.length);

    for (let i = 0; i < files.length; i++) {
      let file = files[i];
      if (selectedFiles.length + newFiles.length >= MAX_FILES) {
        setError(`Maximum ${MAX_FILES} images allowed`);
        break;
      }

      const isValidType = ALLOWED_TYPES.includes(file.type) || isHeicFile(file);
      if (!isValidType) { setError('Please upload PNG, JPG, WEBP, or HEIC images'); processingCount++; continue; }
      if (file.size > MAX_FILE_SIZE) { setError('File size must be less than 10MB'); processingCount++; continue; }

      try {
        if (isHeicFile(file)) {
          setError('Converting HEIC image...');
          file = await convertHeicToJpeg(file);
          setError('');
        }
        const compressedFile = await compressImage(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          newFiles.push({ file: compressedFile, preview: reader.result as string });
          processingCount++;
          if (processingCount >= totalToProcess) {
            setSelectedFiles(prev => [...prev, ...newFiles]);
          }
        };
        reader.readAsDataURL(compressedFile);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to process image');
        processingCount++;
      }
    }
  }, [selectedFiles.length]);

  const handleTrain = useCallback(async () => {
    if (selectedFiles.length < MIN_FILES) {
      setError(`At least ${MIN_FILES} images required`);
      return;
    }
    if (!petName || petName.trim().length < 2) {
      setError("Please enter your pet's name (at least 2 characters)");
      return;
    }

    // Cache for OAuth redirect recovery
    try {
      const previews = selectedFiles.map(f => f.preview);
      localStorage.setItem('pendingUploadImages', JSON.stringify(previews));
      localStorage.setItem('pendingTriggerWord', petName);
    } catch { /* ignore */ }

    // Auth pre-flight
    try {
      const authRes = await fetch('/api/models');
      if (authRes.status === 401) {
        showAuthModal({
          reason: 'Sign in to train your pet model',
          onSuccess: () => handleTrainRef.current(),
        });
        return;
      }
    } catch { /* continue */ }

    setIsSubmitting(true);
    setError('');
    setStage('uploading');

    try {
      const formData = new FormData();
      selectedFiles.forEach((img) => formData.append('images', img.file));
      formData.append('triggerWord', petName);

      const response = await fetch('/api/train', {
        method: 'POST',
        body: formData,
      });

      if (response.status !== 413 && response.status !== 401 && response.status !== 400) {
        setStage('training');
      }

      if (!response.ok) {
        if (response.status === 401) {
          setIsSubmitting(false);
          setStage('idle');
          showAuthModal({
            reason: 'Sign in to train your pet model',
            onSuccess: () => handleTrainRef.current(),
          });
          return;
        }
        let errorMessage = 'Failed to start training';
        if (response.status === 413) {
          errorMessage = 'Images are too large. Please reduce file sizes.';
        } else {
          try {
            const data = await response.json();
            errorMessage = data.error || errorMessage;
          } catch {
            errorMessage = `Request failed with status ${response.status}`;
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Clear cached images
      localStorage.removeItem('pendingUploadImages');
      localStorage.removeItem('pendingTriggerWord');

      if (data.success || data.pending) {
        // Training started (or completed immediately) — notify parent
        onTrainingStarted({
          id: data.pendingTrainingId || 0,
          trigger_word: petName,
          images_count: selectedFiles.length,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start training');
      setStage('idle');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedFiles, petName, showAuthModal, onTrainingStarted]);

  handleTrainRef.current = handleTrain;

  const canTrain = selectedFiles.length >= MIN_FILES && petName.trim().length >= 2 && !isSubmitting;

  return (
    <div className="dash-upload-container">
      {/* Camera Modal */}
      {showCamera && (
        <CameraCapture
          onPhotosCapture={async (photos: File[]) => {
            const dt = new DataTransfer();
            photos.forEach(f => dt.items.add(f));
            await handleFilesSelect(dt.files);
          }}
          onClose={() => setShowCamera(false)}
          maxPhotos={MAX_FILES - selectedFiles.length}
        />
      )}

      {/* Upload Zone */}
      {selectedFiles.length === 0 ? (
        <>
          {isMobile ? (
            <div className="dash-upload-mobile-buttons">
              <button className="dash-upload-btn-primary" onClick={() => fileInputRef.current?.click()}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Choose from Photos
              </button>
              <button className="dash-upload-btn-secondary" onClick={() => setShowCamera(true)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Take New Photos
              </button>
              <p className="dash-upload-hint">Upload 5–20 clear photos of your pet</p>
            </div>
          ) : (
            <div
              className={`dash-upload-zone ${isDragging ? 'dash-upload-zone-active' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length) handleFilesSelect(e.dataTransfer.files); }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
            >
              <div className="dash-upload-zone-content">
                <span className="dash-upload-zone-icon">📸</span>
                <p className="dash-upload-zone-text">Click to upload or drag and drop</p>
                <p className="dash-upload-hint">Upload 5–20 clear photos of your pet</p>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Preview Grid */}
          <div className="dash-upload-header">
            <div className="dash-upload-count">
              <span>Your Photos</span>
              <span className={`dash-upload-badge ${selectedFiles.length < MIN_FILES ? 'dash-upload-badge-warn' : 'dash-upload-badge-ok'}`}>
                {selectedFiles.length} of {MIN_FILES}–{MAX_FILES}
              </span>
            </div>
            <div className="dash-upload-header-actions">
              <button className="dash-upload-add-more" onClick={() => fileInputRef.current?.click()}>
                + Add More
              </button>
              {isMobile && (
                <button className="dash-upload-add-more" onClick={() => setShowCamera(true)}>
                  Camera
                </button>
              )}
              <button className="dash-upload-remove-all" onClick={() => { setSelectedFiles([]); setError(''); }}>
                Remove All
              </button>
            </div>
          </div>

          {selectedFiles.length < MIN_FILES && (
            <p className="dash-upload-warning">
              Add {MIN_FILES - selectedFiles.length} more photo{MIN_FILES - selectedFiles.length !== 1 ? 's' : ''} (minimum {MIN_FILES} required)
            </p>
          )}

          <div className="dash-upload-preview">
            {selectedFiles.map((img, i) => (
              <div key={i} className="dash-upload-preview-item">
                <img src={img.preview} alt={`Pet ${i + 1}`} />
                <button
                  className="dash-upload-preview-remove"
                  onClick={() => setSelectedFiles(prev => prev.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Pet Name + Train Button */}
          <div className="dash-upload-form">
            <div className="dash-upload-field">
              <label htmlFor="pet-name">What&apos;s your pet&apos;s name?</label>
              <input
                id="pet-name"
                type="text"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                placeholder="e.g., Max, Luna, Whiskers"
                className="dash-upload-input"
                disabled={isSubmitting}
              />
            </div>

            <button
              className="dash-upload-submit"
              onClick={handleTrain}
              disabled={!canTrain}
            >
              {isSubmitting ? (
                <span className="dash-upload-submit-loading">
                  <svg className="dash-upload-spinner" viewBox="0 0 24 24" fill="none">
                    <circle className="dash-upload-spinner-track" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="dash-upload-spinner-head" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {stage === 'uploading' ? 'Uploading...' : 'Starting training...'}
                </span>
              ) : (
                'Train My Pet — Free'
              )}
            </button>

            {onCancel && (
              <button className="dash-upload-cancel" onClick={onCancel}>
                Cancel
              </button>
            )}
          </div>
        </>
      )}

      {/* Error */}
      {error && (
        <div className="dash-upload-error">
          <p>{error}</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif,.heic,.heif"
        onChange={(e) => { if (e.target.files?.length) handleFilesSelect(e.target.files); }}
        multiple
        style={{ display: 'none' }}
      />
    </div>
  );
}
