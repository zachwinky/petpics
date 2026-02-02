// localStorage helpers for saved frames

import { LayoutType } from '@/components/FrameBuilder/frameLayouts';
import { StyleType } from '@/components/FrameBuilder/frameStyles';

export interface SavedFrame {
  id: string;
  name: string;
  images: string[];
  layout: LayoutType;
  style: StyleType;
  createdAt: number;
}

const STORAGE_KEY = 'petpics-frames';

export const getSavedFrames = (): SavedFrame[] => {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading saved frames:', error);
    return [];
  }
};

export const saveFrame = (frame: SavedFrame): void => {
  if (typeof window === 'undefined') return;

  try {
    const frames = getSavedFrames();
    frames.push(frame);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(frames));
  } catch (error) {
    console.error('Error saving frame:', error);
  }
};

export const updateFrame = (frameId: string, updates: Partial<SavedFrame>): void => {
  if (typeof window === 'undefined') return;

  try {
    const frames = getSavedFrames();
    const index = frames.findIndex(f => f.id === frameId);
    if (index !== -1) {
      frames[index] = { ...frames[index], ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(frames));
    }
  } catch (error) {
    console.error('Error updating frame:', error);
  }
};

export const deleteSavedFrame = (frameId: string): void => {
  if (typeof window === 'undefined') return;

  try {
    const frames = getSavedFrames();
    const filtered = frames.filter(f => f.id !== frameId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting frame:', error);
  }
};

export const clearAllFrames = (): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing frames:', error);
  }
};
