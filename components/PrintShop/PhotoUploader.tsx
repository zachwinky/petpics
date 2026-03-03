'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

interface PhotoUploaderProps {
  initialProductType?: string;
}

export default function PhotoUploader({ initialProductType }: PhotoUploaderProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Please upload a JPEG, PNG, or WebP image.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum size is 20MB.');
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const res = await fetch('/api/print/upload-image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Upload failed. Please try again.');
        setUploading(false);
        return;
      }

      const params = new URLSearchParams({ image: data.imageUrl });
      if (initialProductType) {
        params.set('productType', initialProductType);
      }
      router.push(`/print/configure?${params.toString()}`);
    } catch {
      setError('Upload failed. Please check your connection and try again.');
      setUploading(false);
    }
  }, [selectedFile, initialProductType, router]);

  const handleReset = useCallback(() => {
    setPreview(null);
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div className="max-w-lg mx-auto px-4 py-8 md:py-16">
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Print Your Photo</h1>
        <p className="text-gray-400 text-sm md:text-base">
          Upload any image and we&apos;ll print it on premium canvas, posters, or mugs.
        </p>
      </div>

      {!preview ? (
        /* Upload zone */
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full aspect-square max-h-[400px] rounded-2xl border-2 border-dashed border-gray-600 hover:border-coral-400 bg-gray-900/50 hover:bg-gray-900 transition-all flex flex-col items-center justify-center gap-4 cursor-pointer"
        >
          <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
              <path d="M12 5v14m-7-7h14" />
            </svg>
          </div>
          <div className="text-gray-400 text-sm md:text-base font-medium">
            Tap to select a photo
          </div>
          <div className="text-gray-600 text-xs">
            JPEG, PNG, or WebP &middot; Max 20MB
          </div>
        </button>
      ) : (
        /* Preview */
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-gray-900 flex items-center justify-center">
            <img
              src={preview}
              alt="Selected photo"
              className="max-h-[400px] w-auto max-w-full object-contain"
            />
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="w-full text-sm text-gray-400 hover:text-white transition-colors py-2"
          >
            Change photo
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {error && (
        <div className="mt-4 text-sm text-red-400 text-center">{error}</div>
      )}

      {preview && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading}
          className="mt-6 w-full py-4 rounded-xl bg-coral-500 hover:bg-coral-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-base transition-colors flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Uploading...
            </>
          ) : (
            <>
              Continue
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14m-7-7 7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      )}
    </div>
  );
}
