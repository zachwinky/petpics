'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { PRESET_PROMPTS } from '@/lib/presetPrompts';
import dynamic from 'next/dynamic';
import Toast, { useToast } from './Toast';
import { useAuthModal } from '@/lib/auth-context';
import PhotoGuide from './PhotoGuide';

// Dynamically import CameraCapture to avoid SSR issues with MediaDevices API
const CameraCapture = dynamic(() => import('./CameraCapture'), { ssr: false });

interface SelectedImage {
  file: File;
  preview: string;
}

type Mode = 'pebblely' | 'flux';

export default function ImageUpload() {
  const [mode, setMode] = useState<Mode>('flux');
  const [selectedFiles, setSelectedFiles] = useState<SelectedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingSuccess, setTrainingSuccess] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [trainedLoraUrl, setTrainedLoraUrl] = useState<string | null>(null);
  const [triggerWord, setTriggerWord] = useState('TOK');
  const [showCamera, setShowCamera] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [trainingStage, setTrainingStage] = useState<'idle' | 'uploading' | 'training' | 'complete'>('idle');
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [showTrainingStartedModal, setShowTrainingStartedModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleTrainRef = useRef<() => void>(() => {});
  const handleGenerateRef = useRef<() => void>(() => {});
  const { toast, showToast, hideToast } = useToast();
  const { showAuthModal, showCreditModal } = useAuthModal();

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load saved model from localStorage on mount
  useEffect(() => {
    const savedLoraUrl = localStorage.getItem('trainedLoraUrl');
    const savedTriggerWord = localStorage.getItem('triggerWord');
    if (savedLoraUrl) {
      setTrainedLoraUrl(savedLoraUrl);
    }
    if (savedTriggerWord) {
      setTriggerWord(savedTriggerWord);
    }
  }, []);

  // Restore cached images after OAuth redirect (runs once on mount)
  useEffect(() => {
    const restoreCachedImages = async () => {
      const cached = localStorage.getItem('pendingUploadImages');
      const cachedTriggerWord = localStorage.getItem('pendingTriggerWord');

      console.log('Checking for cached images:', { hasCached: !!cached, cachedTriggerWord });

      if (cached) {
        try {
          const previews: string[] = JSON.parse(cached);
          console.log('Found cached images:', previews.length);

          // Convert base64 previews back to File objects
          const restoredFiles: SelectedImage[] = await Promise.all(
            previews.map(async (preview, index) => {
              // Fetch the base64 data and convert to blob
              const response = await fetch(preview);
              const blob = await response.blob();
              const file = new File([blob], `restored-image-${index}.jpg`, { type: 'image/jpeg' });
              return { file, preview };
            })
          );

          console.log('Restored files:', restoredFiles.length);
          setSelectedFiles(restoredFiles);

          // Clear the cache after restoring
          localStorage.removeItem('pendingUploadImages');

          // Use alert for more visible feedback during debugging
          // showToast('Your images have been restored!', 'success');
        } catch (err) {
          console.error('Failed to restore cached images:', err);
          localStorage.removeItem('pendingUploadImages');
        }
      }

      if (cachedTriggerWord) {
        setTriggerWord(cachedTriggerWord);
        localStorage.removeItem('pendingTriggerWord');
      }
    };

    restoreCachedImages();
  }, []); // Empty dependency - only run on mount

  // Auto-retry training after successful Stripe payment
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      const pending = localStorage.getItem('pendingAction');
      if (pending) {
        try {
          const { action, timestamp } = JSON.parse(pending);
          // Only auto-retry if action is recent (within 1 hour)
          if (action === 'train' && Date.now() - timestamp < 3600000) {
            showToast('Payment successful! Starting training...', 'success');
            // Wait for images to be restored, then auto-trigger
            setTimeout(() => {
              if (selectedFiles.length >= 5) {
                handleTrainRef.current();
              }
            }, 1000);
          }
        } catch (e) {
          console.error('Failed to parse pending action:', e);
        }
        localStorage.removeItem('pendingAction');
      }
      // Clean the URL
      window.history.replaceState({}, '', '/');
    }
  }, [selectedFiles.length, showToast]);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/heic', 'image/heif'];
  const MAX_FILES = 20; // Maximum number of pet images (more for FLUX training)

  // Check if file is HEIC/HEIF format
  const isHeicFile = (file: File): boolean => {
    const heicTypes = ['image/heic', 'image/heif'];
    if (heicTypes.includes(file.type)) return true;
    // Also check by extension since some browsers don't set the correct MIME type
    const ext = file.name.toLowerCase().split('.').pop();
    return ext === 'heic' || ext === 'heif';
  };

  // Convert HEIC to JPEG (dynamically imports heic2any to avoid SSR issues)
  const convertHeicToJpeg = async (file: File): Promise<File> => {
    try {
      // Dynamic import to avoid "window is not defined" during SSR
      const heic2any = (await import('heic2any')).default;

      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.9,
      });

      // heic2any can return a single blob or array of blobs
      const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;

      // Create new file with .jpg extension
      const newFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
      return new File([blob], newFileName, { type: 'image/jpeg' });
    } catch (error) {
      console.error('HEIC conversion failed:', error);
      throw new Error('Failed to convert HEIC image. Please try a different format.');
    }
  };

  const validateFile = (file: File) => {
    // Reset error
    setError('');

    // Check file type (including HEIC)
    const isValidType = ALLOWED_TYPES.includes(file.type) || isHeicFile(file);
    if (!isValidType) {
      setError('Please upload a PNG, JPG, WEBP, or HEIC image');
      return false;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      setError('File size must be less than 10MB');
      return false;
    }

    return true;
  };

  // Compress image to reduce file size for upload
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // More aggressive dimensions - AI training works well with 1024px
          // Phone photos are often 3000-4000px, so this is a big reduction
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                console.log(`Compressed ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.80 // Reduced quality from 0.85 to 0.80 for better compression
          );
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFilesSelect = async (files: FileList) => {
    const newFiles: SelectedImage[] = [];
    let processingCount = 0;
    const totalToProcess = Math.min(files.length, MAX_FILES - selectedFiles.length);

    for (let i = 0; i < files.length; i++) {
      let file = files[i];

      if (selectedFiles.length + newFiles.length >= MAX_FILES) {
        setError(`Maximum ${MAX_FILES} images allowed`);
        break;
      }

      if (!validateFile(file)) {
        processingCount++;
        continue;
      }

      try {
        // Convert HEIC to JPEG if needed
        if (isHeicFile(file)) {
          setError('Converting HEIC image...');
          file = await convertHeicToJpeg(file);
          setError('');
        }

        // Compress image before adding
        const compressedFile = await compressImage(file);

        const reader = new FileReader();
        reader.onloadend = () => {
          newFiles.push({
            file: compressedFile,
            preview: reader.result as string,
          });
          processingCount++;

          if (processingCount >= totalToProcess) {
            setSelectedFiles([...selectedFiles, ...newFiles]);
          }
        };
        reader.readAsDataURL(compressedFile);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to process image');
        processingCount++;
      }
    }
  };

  // Handle photos captured from camera
  const handleCameraPhotos = async (photos: File[]) => {
    // Create a FileList-like object to reuse handleFilesSelect
    const dataTransfer = new DataTransfer();
    photos.forEach(file => dataTransfer.items.add(file));
    await handleFilesSelect(dataTransfer.files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files.length > 0) {
      handleFilesSelect(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelect(e.target.files);
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAll = () => {
    setSelectedFiles([]);
    setError('');
    setGeneratedImages([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTrain = async () => {
    if (selectedFiles.length < 5) {
      setError('At least 5 images required for training');
      return;
    }

    // Validate product name
    if (!triggerWord || triggerWord.trim() === '' || triggerWord === 'TOK') {
      setError('Please enter a unique pet name (e.g., FLUFFY, MAXTHEDOG, WHISKERS)');
      return;
    }

    // Validate product name length
    if (triggerWord.trim().length < 2) {
      setError('Pet name must be at least 2 characters');
      return;
    }

    // Cache images + trigger word before any modal/redirect
    const previews = selectedFiles.map(f => f.preview);
    try {
      localStorage.setItem('pendingUploadImages', JSON.stringify(previews));
      localStorage.setItem('pendingTriggerWord', triggerWord);
      localStorage.setItem('pendingAction', JSON.stringify({
        action: 'train',
        timestamp: Date.now(),
      }));
    } catch (err) {
      console.error('Failed to cache to localStorage:', err);
    }

    // PRE-FLIGHT CHECK: Credits (also checks auth via 401)
    // This allows us to show credit modal before attempting upload
    try {
      const creditsRes = await fetch('/api/user/credits');
      if (creditsRes.status === 401) {
        // Not authenticated - show auth modal
        showAuthModal({
          reason: 'Sign in to train your AI model',
          onSuccess: () => handleTrainRef.current(),
        });
        return;
      }
      if (creditsRes.ok) {
        const { credits } = await creditsRes.json();
        if (credits < 10) {
          showCreditModal({
            required: 10,
            current: credits,
          });
          return;
        }
      }
    } catch (e) {
      console.error('Failed to check credits:', e);
      // Continue anyway - API will catch it
    }

    // Clear pending action since we're proceeding with training
    localStorage.removeItem('pendingAction');

    setIsTraining(true);
    setError('');
    setTrainingSuccess(false);
    setTrainingStage('uploading');
    showToast('Uploading images...', 'loading');

    try {
      const formData = new FormData();

      selectedFiles.forEach((selectedImage) => {
        formData.append('images', selectedImage.file);
      });

      formData.append('triggerWord', triggerWord);

      const response = await fetch('/api/train', {
        method: 'POST',
        body: formData,
      });

      // If we get a response back, the request was sent successfully
      // Update stage to show training has started on FAL servers
      if (response.status !== 413 && response.status !== 401 && response.status !== 402 && response.status !== 400) {
        setTrainingStage('training');
        showToast('Training started! This takes about 10 minutes...', 'info');
      }

      if (!response.ok) {
        // Handle auth and credit errors with modals (fallback if pre-flight didn't catch them)
        if (response.status === 401) {
          setIsTraining(false);
          setTrainingStage('idle');
          showAuthModal({
            reason: 'Sign in to train your AI model',
            onSuccess: () => handleTrainRef.current(),
          });
          return;
        }

        if (response.status === 402) {
          setIsTraining(false);
          setTrainingStage('idle');
          try {
            const data = await response.json();
            showCreditModal({
              required: data.required || 10,
              current: data.current || 0,
            });
          } catch {
            showCreditModal({ required: 10, current: 0 });
          }
          return;
        }

        // Try to parse error JSON, fallback to text
        let errorMessage = 'Failed to train pet model';

        // Special handling for common HTTP errors
        if (response.status === 413) {
          errorMessage = 'Images are too large. Please reduce image file sizes to under 2MB each.';
        } else {
          try {
            const data = await response.json();
            errorMessage = data.error || errorMessage;
          } catch {
            // If JSON parsing fails, don't try to read text (stream already consumed)
            errorMessage = `Request failed with status ${response.status}`;
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.success && data.loraUrl) {
        setTrainedLoraUrl(data.loraUrl);
        setTrainingSuccess(true);
        setTrainingStage('complete');
        showToast('Training complete! Your AI model is ready.', 'success');
        // Save to localStorage for persistence
        localStorage.setItem('trainedLoraUrl', data.loraUrl);
        localStorage.setItem('triggerWord', triggerWord);
        // Clear any pending upload cache since training succeeded
        localStorage.removeItem('pendingUploadImages');
        localStorage.removeItem('pendingTriggerWord');
      } else if (data.pending && data.requestId) {
        // Training started successfully - show popup modal
        setTrainingStage('training');
        setShowTrainingStartedModal(true);
        // Clear any pending upload cache since training started
        localStorage.removeItem('pendingUploadImages');
        localStorage.removeItem('pendingTriggerWord');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to train pet model');
      setTrainingStage('idle');
      showToast(err instanceof Error ? err.message : 'Training failed', 'error');
    } finally {
      setIsTraining(false);
    }
  };

  // Keep the ref updated so modal callbacks always have the latest version
  handleTrainRef.current = handleTrain;

  // Poll for training status when job exceeds initial timeout
  const pollTrainingStatus = async (requestId: string, word: string, imagesCount: number) => {
    const pollInterval = 10000; // Check every 10 seconds
    const maxPolls = 60; // Max 10 minutes of polling
    let polls = 0;

    const poll = async () => {
      if (polls >= maxPolls) {
        setError('Training is taking longer than expected. Please check your dashboard later.');
        setTrainingStage('idle');
        setPendingRequestId(null);
        showToast('Training timeout. Check your dashboard later.', 'error');
        return;
      }

      polls++;

      try {
        const response = await fetch('/api/train/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId, triggerWord: word, imagesCount }),
        });

        const data = await response.json();

        if (data.status === 'completed' && data.loraUrl) {
          setTrainedLoraUrl(data.loraUrl);
          setTrainingSuccess(true);
          setTrainingStage('complete');
          setPendingRequestId(null);
          showToast('Training complete! Your AI model is ready.', 'success');
          localStorage.setItem('trainedLoraUrl', data.loraUrl);
          localStorage.setItem('triggerWord', word);
        } else if (data.status === 'failed') {
          setError(data.error || 'Training failed');
          setTrainingStage('idle');
          setPendingRequestId(null);
          showToast(data.error || 'Training failed', 'error');
        } else if (data.status === 'pending') {
          // Still in progress, continue polling
          setTimeout(poll, pollInterval);
        }
      } catch (err) {
        console.error('Error polling training status:', err);
        // Continue polling on network errors
        setTimeout(poll, pollInterval);
      }
    };

    // Start polling
    setTimeout(poll, pollInterval);
  };

  const handleGenerate = async () => {
    if (selectedFiles.length === 0) return;

    setIsGenerating(true);
    setError('');

    try {
      if (mode === 'pebblely') {
        // Pebblely mode - quick generation
        const formData = new FormData();
        selectedFiles.forEach((selectedImage) => {
          formData.append('images', selectedImage.file);
        });
        formData.append('prompt', prompt || 'professional pet photoshoot, natural lighting, beautiful background');

        const response = await fetch('/api/generate', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to generate image');
        }

        if (data.success && data.imageUrl) {
          setGeneratedImages([data.imageUrl]);
        }
      } else {
        // FLUX mode - generate with trained LoRA
        if (!trainedLoraUrl) {
          throw new Error('No trained pet model found. Please train your pet first.');
        }

        const response = await fetch('/api/flux-generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            loraUrl: trainedLoraUrl,
            triggerWord,
            prompt: prompt || 'professional pet photoshoot, natural lighting, beautiful background',
          }),
        });

        if (!response.ok) {
          // Handle auth and credit errors with modals
          if (response.status === 401) {
            setIsGenerating(false);
            showAuthModal({
              reason: 'Sign in to generate images',
              onSuccess: () => handleGenerateRef.current(),
            });
            return;
          }

          if (response.status === 402) {
            setIsGenerating(false);
            try {
              const data = await response.json();
              showCreditModal({
                required: data.required || 1,
                current: data.current || 0,
              });
            } catch {
              showCreditModal({ required: 1, current: 0 });
            }
            return;
          }

          // Try to parse error JSON, fallback to text
          let errorMessage = 'Failed to generate image';
          try {
            const data = await response.json();
            errorMessage = data.error || errorMessage;
          } catch {
            const text = await response.text();
            errorMessage = text || `Request failed with status ${response.status}`;
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();

        if (data.success && data.imageUrls) {
          setGeneratedImages(data.imageUrls);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  // Keep the ref updated so modal callbacks always have the latest version
  handleGenerateRef.current = handleGenerate;

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      {/* Training Started Modal */}
      {showTrainingStartedModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Training Started!</h2>
              <p className="text-gray-600">
                Thanks! We are now training your AI model. Check your dashboard in about <strong>10 minutes</strong> to see the result.
              </p>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <p className="text-sm text-indigo-800">
                <strong>Pet Name:</strong> <code className="bg-indigo-100 px-2 py-0.5 rounded">{triggerWord}</code>
              </p>
              <p className="text-sm text-indigo-700 mt-1">
                Your model will appear in your dashboard once training is complete.
              </p>
            </div>
            <a
              href="/dashboard"
              className="block w-full py-3 px-6 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-center"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      )}

      {/* Mode Toggle - Hidden for now, focusing on FLUX only */}
      {false && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Your Method</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setMode('pebblely')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                mode === 'pebblely'
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 bg-white hover:border-indigo-300'
              }`}
            >
              <div className="font-semibold text-gray-900 mb-1">⚡ Instant Backgrounds</div>
              <div className="text-sm text-gray-600">
                Upload 1-3 photos. Get results in seconds. Perfect for quick backgrounds.
              </div>
            </button>
            <button
              onClick={() => setMode('flux')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                mode === 'flux'
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 bg-white hover:border-indigo-300'
              }`}
            >
              <div className="font-semibold text-gray-900 mb-1">🎯 Custom AI Model</div>
              <div className="text-sm text-gray-600">
                Train once (~10 min, $10), then $2 for 5 photos. Perfect accuracy guaranteed.
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Camera Capture Modal */}
      {showCamera && (
        <CameraCapture
          onPhotosCapture={handleCameraPhotos}
          onClose={() => setShowCamera(false)}
          maxPhotos={MAX_FILES - selectedFiles.length}
        />
      )}

      {/* Photo Quality Guide */}
      <PhotoGuide />

      {/* Upload Area */}
      <div className="space-y-4">
        {/* Mobile: Camera Button */}
        {isMobile && (
          <button
            onClick={() => setShowCamera(true)}
            className="w-full py-4 px-6 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Take Photos with Camera
          </button>
        )}

        {/* Divider on mobile */}
        {isMobile && (
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="text-sm text-gray-500">or</span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>
        )}

        {/* File Upload Area */}
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-xl p-8 md:p-12 transition-all cursor-pointer ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-300 bg-gray-50 hover:border-indigo-400'
          }`}
        >
          <div className="text-center space-y-4">
            <div className="text-5xl md:text-6xl">📸</div>
            <div>
              <p className="text-base md:text-lg font-medium text-gray-700">
                {isMobile ? 'Tap to choose from library' : 'Click to upload or drag and drop'}
              </p>
              <p className="text-sm text-gray-500">
                PNG, JPG, WEBP, HEIC up to 10MB (max {MAX_FILES} images)
                {mode === 'flux' && <span className="block mt-1 font-medium text-indigo-600">Custom AI: Upload 5-20 images of your pet</span>}
              </p>
            </div>
          </div>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif,.heic,.heif"
        onChange={handleInputChange}
        multiple
        className="hidden"
      />

      {selectedFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Your Photos
              </h3>
              <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                selectedFiles.length < 5
                  ? 'bg-red-100 text-red-700'
                  : selectedFiles.length >= 5 && selectedFiles.length <= 15
                    ? 'bg-green-100 text-green-700'
                    : 'bg-orange-100 text-orange-700'
              }`}>
                {selectedFiles.length} of 5-20
              </span>
            </div>
            <button
              onClick={handleRemoveAll}
              className="text-sm text-red-600 hover:text-red-700 font-medium cursor-pointer"
            >
              Remove All
            </button>
          </div>
          {selectedFiles.length < 5 && (
            <p className="text-sm text-red-600">
              Add {5 - selectedFiles.length} more photo{5 - selectedFiles.length !== 1 ? 's' : ''} (minimum 5 required)
            </p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {selectedFiles.map((selectedImage, index) => (
              <div key={index} className="relative group">
                <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-square">
                  <img
                    src={selectedImage.preview}
                    alt={`Pet ${index + 1}`}
                    className="w-full h-full object-contain"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(index);
                    }}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1 truncate">
                  {selectedImage.file.name}
                </p>
              </div>
            ))}
          </div>

          {/* FLUX Training Section */}
          {mode === 'flux' && !trainedLoraUrl && !trainingSuccess && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-indigo-900">Step 1: Train Your Custom AI</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What should we call this pet? <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={triggerWord}
                  onChange={(e) => setTriggerWord(e.target.value)}
                  onFocus={(e) => {
                    if (e.target.value === 'TOK') {
                      setTriggerWord('');
                    }
                  }}
                  placeholder="e.g., FLUFFY, MAXTHEDOG, WHISKERS"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder:text-gray-400"
                  disabled={isTraining}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  A short nickname to identify your pet (at least 2 characters)
                </p>
              </div>
              <button
                className="w-full py-3 px-6 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
                onClick={handleTrain}
                disabled={isTraining || selectedFiles.length < 5 || !triggerWord || triggerWord === 'TOK' || triggerWord.trim().length < 2}
              >
                {isTraining ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Training AI Model (~10 minutes)...
                  </span>
                ) : 'Train Pet Model (10 credits)'}
              </button>
              {selectedFiles.length < 5 && (
                <p className="text-sm text-red-600">Upload at least 5 images of your pet to train the AI</p>
              )}
              {(!triggerWord || triggerWord === 'TOK' || triggerWord.trim().length < 2) && selectedFiles.length >= 5 && (
                <p className="text-sm text-red-600">Please enter a unique pet name (at least 2 characters)</p>
              )}
              {isTraining && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3">
                  {/* Progress Steps */}
                  <div className="flex items-center gap-2">
                    {/* Step 1: Uploading */}
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                      trainingStage === 'uploading'
                        ? 'bg-blue-600 text-white'
                        : trainingStage === 'training' || trainingStage === 'complete'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                    }`}>
                      {trainingStage === 'uploading' ? (
                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (trainingStage === 'training' || trainingStage === 'complete') ? (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : null}
                      Uploading
                    </div>
                    <div className="w-4 h-px bg-gray-300"></div>
                    {/* Step 2: Training */}
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                      trainingStage === 'training'
                        ? 'bg-blue-600 text-white'
                        : trainingStage === 'complete'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                    }`}>
                      {trainingStage === 'training' ? (
                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : trainingStage === 'complete' ? (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : null}
                      Training AI
                    </div>
                    <div className="w-4 h-px bg-gray-300"></div>
                    {/* Step 3: Complete */}
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                      trainingStage === 'complete'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {trainingStage === 'complete' && (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      Complete
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-blue-800">
                      {trainingStage === 'uploading' && (
                        <><strong>Uploading images...</strong> Preparing your photos for training.</>
                      )}
                      {trainingStage === 'training' && (
                        <><strong>Training in progress!</strong> Request sent successfully. Your AI model is now being trained on FAL servers.</>
                      )}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      {trainingStage === 'uploading' && 'This should only take a moment.'}
                      {trainingStage === 'training' && 'Training typically takes about 10 minutes. You can stay on this page or come back later.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Training Success Message */}
          {mode === 'flux' && trainingSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-green-900 text-lg">Training Complete!</h4>
                  <p className="text-sm text-green-700 mt-1">
                    Your pet model has been successfully trained and saved to your account.
                  </p>
                </div>
              </div>
              <div className="bg-white border border-green-300 rounded-lg p-4">
                <p className="text-gray-900 font-medium mb-2">What's next?</p>
                <p className="text-sm text-gray-700 mb-3">
                  Your pet <code className="bg-gray-100 px-2 py-0.5 rounded text-indigo-600 font-mono">{triggerWord}</code> is now ready to generate professional pet photos!
                </p>
                <a
                  href="/dashboard"
                  className="inline-block w-full text-center px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Go to Dashboard to Generate Photos
                </a>
              </div>
            </div>
          )}

          {/* FLUX Model Trained Success */}
          {mode === 'flux' && trainedLoraUrl && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-semibold text-green-900">AI Trained Successfully!</span>
                </div>
                <button
                  onClick={() => {
                    setTrainedLoraUrl(null);
                    localStorage.removeItem('trainedLoraUrl');
                    localStorage.removeItem('triggerWord');
                    setTriggerWord('TOK');
                  }}
                  className="text-sm text-red-600 hover:text-red-700 font-medium cursor-pointer"
                >
                  Train New Pet
                </button>
              </div>
              <p className="text-sm text-green-700 mt-1">Pet name: <code className="bg-green-100 px-1 rounded">{triggerWord}</code> - Ready to generate unlimited photos!</p>
            </div>
          )}

          {/* Generation Section - shown for Pebblely or trained FLUX */}
          {(mode === 'pebblely' || (mode === 'flux' && trainedLoraUrl)) && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {mode === 'flux' ? `Step 2: Choose Your Scene` : 'Describe Your Scene'}
                </label>

                {/* Preset dropdown for both modes */}
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-2 text-gray-900"
                  onChange={(e) => {
                    setPrompt(e.target.value);
                  }}
                  value={prompt}
                >
                  <option value="" className="text-gray-400">Select a scene preset...</option>
                  {mode === 'flux' ? (
                    // FLUX presets - more detailed prompts
                    PRESET_PROMPTS.map((preset) => (
                      <option key={preset.id} value={preset.prompt}>
                        {preset.label} - {preset.description}
                      </option>
                    ))
                  ) : (
                    // Pebblely presets - simple keywords
                    <>
                      <option value="Studio">Studio</option>
                      <option value="Tabletop">Tabletop</option>
                      <option value="Kitchen">Kitchen</option>
                      <option value="Cafe">Cafe</option>
                      <option value="Outdoors">Outdoors</option>
                      <option value="Nature">Nature</option>
                      <option value="Beach">Beach</option>
                      <option value="Bathroom">Bathroom</option>
                      <option value="Furniture">Furniture</option>
                      <option value="Flowers">Flowers</option>
                      <option value="Silk">Silk</option>
                      <option value="Water">Water</option>
                      <option value="Snow">Snow</option>
                      <option value="Surprise me">Surprise me</option>
                    </>
                  )}
                </select>

                {mode === 'flux' && prompt && (
                  <div className="mb-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <p className="text-xs font-medium text-indigo-900 mb-1">Preview:</p>
                    <p className="text-sm text-indigo-700">
                      Professional pet photography of {triggerWord}, {prompt}, high quality, detailed, studio lighting
                    </p>
                  </div>
                )}
              </div>
              <button
                className="w-full py-3 px-6 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
                onClick={handleGenerate}
                disabled={isGenerating || !prompt}
              >
                {isGenerating ? 'Creating your photos...' : mode === 'flux' ? 'Generate 4 Photos with Custom AI' : 'Generate Background'}
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {generatedImages.length > 0 && (
        <div className="space-y-4 pt-8 border-t border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Generated Images</h3>
          <div className="grid gap-4">
            {generatedImages.map((imageUrl, index) => (
              <div key={index} className="relative bg-gray-100 rounded-xl overflow-hidden">
                <img
                  src={imageUrl}
                  alt={`Generated ${index + 1}`}
                  className="w-full h-auto"
                />
                <div className="absolute bottom-4 right-4">
                  <a
                    href={imageUrl}
                    download={`generated-image-${index + 1}.png`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-white text-indigo-600 font-medium rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
                  >
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
