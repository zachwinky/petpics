'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import AuthModal from '@/components/AuthModal';
import CreditModal from '@/components/CreditModal';

interface AuthModalOptions {
  reason?: string;
  onSuccess?: () => void;
}

interface CreditModalOptions {
  required: number;
  current: number;
}

interface AuthModalContextType {
  showAuthModal: (options?: AuthModalOptions) => void;
  showCreditModal: (options: CreditModalOptions) => void;
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

  // Credit modal state
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [creditModalOptions, setCreditModalOptions] = useState<CreditModalOptions>({
    required: 0,
    current: 0,
  });

  const showAuthModal = useCallback((options?: AuthModalOptions) => {
    setAuthModalOptions(options || {});
    setAuthModalOpen(true);
  }, []);

  const showCreditModal = useCallback((options: CreditModalOptions) => {
    setCreditModalOptions(options);
    setCreditModalOpen(true);
  }, []);

  const hideModals = useCallback(() => {
    setAuthModalOpen(false);
    setCreditModalOpen(false);
  }, []);

  const handleAuthClose = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  const handleCreditClose = useCallback(() => {
    setCreditModalOpen(false);
  }, []);

  const handleAuthSuccess = useCallback(() => {
    setAuthModalOpen(false);
    // Execute the success callback if provided
    if (authModalOptions.onSuccess) {
      authModalOptions.onSuccess();
    }
  }, [authModalOptions]);

  return (
    <AuthModalContext.Provider value={{ showAuthModal, showCreditModal, hideModals }}>
      {children}

      <AuthModal
        isOpen={authModalOpen}
        onClose={handleAuthClose}
        onSuccess={handleAuthSuccess}
        reason={authModalOptions.reason}
      />

      <CreditModal
        isOpen={creditModalOpen}
        onClose={handleCreditClose}
        required={creditModalOptions.required}
        current={creditModalOptions.current}
      />
    </AuthModalContext.Provider>
  );
}
