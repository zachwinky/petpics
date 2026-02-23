'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export interface CartItem {
  id: string;
  imageUrl: string;
  generationId: number;
  imageIndex: number;
  productType: string;
  productId: number;
  sizeLabel: string;
  displayName: string;
  variantId: number;
  priceCents: number;
  options: Record<string, string>;
  mockupUrl?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateItemMockup: (id: string, mockupUrl: string) => void;
  clearCart: () => void;
  itemCount: number;
  subtotalCents: number;
}

const CartContext = createContext<CartContextType | null>(null);

const CART_STORAGE_KEY = 'petpics_cart';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

function loadCartFromStorage(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // Ignore parse errors
  }
  return [];
}

function saveCartToStorage(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage errors
  }
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    setItems(loadCartFromStorage());
    setLoaded(true);
  }, []);

  // Save to localStorage whenever items change (after initial load)
  useEffect(() => {
    if (loaded) {
      saveCartToStorage(items);
    }
  }, [items, loaded]);

  // Sync cart across browser tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_STORAGE_KEY && e.newValue !== null) {
        try {
          setItems(JSON.parse(e.newValue));
        } catch { /* ignore */ }
      } else if (e.key === CART_STORAGE_KEY && e.newValue === null) {
        setItems([]);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addItem = useCallback((item: Omit<CartItem, 'id'>) => {
    const newItem: CartItem = { ...item, id: generateId() };
    setItems(prev => [...prev, newItem]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateItemMockup = useCallback((id: string, mockupUrl: string) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, mockupUrl } : item
    ));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const itemCount = items.length;
  const subtotalCents = items.reduce((sum, item) => sum + item.priceCents * (item.options?.quantity ? parseInt(item.options.quantity) : 1), 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateItemMockup, clearCart, itemCount, subtotalCents }}>
      {children}
    </CartContext.Provider>
  );
}
