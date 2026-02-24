'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import AuthModal from '@/components/AuthModal';

interface AuthModalOptions {
  reason?: string;
  onSuccess?: () => void;
}

interface AuthModalContextType {
  showAuthModal: (options?: AuthModalOptions) => void;
  hideModals: () => void;
}

const AuthModalContext = createContext<AuthModalContextType | null>(null);

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
}

interface AuthModalProviderProps {
  children: ReactNode;
}

export function AuthModalProvider({ children }: AuthModalProviderProps) {
  // Auth modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalOptions, setAuthModalOptions] = useState<AuthModalOptions>({});

  const showAuthModal = useCallback((options?: AuthModalOptions) => {
    setAuthModalOptions(options || {});
    setAuthModalOpen(true);
  }, []);

  const hideModals = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  const handleAuthClose = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  const handleAuthSuccess = useCallback(() => {
    setAuthModalOpen(false);
    // Execute the success callback if provided
    if (authModalOptions.onSuccess) {
      authModalOptions.onSuccess();
    }
  }, [authModalOptions]);

  return (
    <AuthModalContext.Provider value={{ showAuthModal, hideModals }}>
      {children}

      <AuthModal
        isOpen={authModalOpen}
        onClose={handleAuthClose}
        onSuccess={handleAuthSuccess}
        reason={authModalOptions.reason}
      />
    </AuthModalContext.Provider>
  );
}
