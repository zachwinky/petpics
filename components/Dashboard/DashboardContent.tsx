'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import StudioOverlay, { StudioModel, StudioPortraitResult } from '@/components/Studio/StudioOverlay';
import { trackStudioOpened } from '@/components/MetaPixelEvents';
import ActiveOrdersSection from './ActiveOrdersSection';
import NewOrderSection from './NewOrderSection';
import OrderHistorySection from './OrderHistorySection';
import MyPetsSection from './MyPetsSection';
import type { PrintOrder, PrintOrderItem, PendingTraining, Model } from '@/lib/db';

type ModelWithCounts = Model & {
  generationCount: number;
  recentImages: string[];
};

interface DashboardContentProps {
  user: { name: string | null; email: string };
  studioModels: StudioModel[];
  modelsWithCounts: ModelWithCounts[];
  pendingTrainings: PendingTraining[];
  activeOrders: PrintOrder[];
  completedOrders: PrintOrder[];
  orderItemsMap: Record<number, PrintOrderItem[]>;
  loadError?: boolean;
}

export default function DashboardContent({
  user,
  studioModels,
  modelsWithCounts,
  pendingTrainings,
  activeOrders,
  completedOrders,
  orderItemsMap,
  loadError,
}: DashboardContentProps) {
  const searchParams = useSearchParams();
  const [studioOpen, setStudioOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<StudioModel | null>(null);
  const [selectedProductType, setSelectedProductType] = useState<string | null>(null);

  // Check for ?product=X URL param or localStorage on mount
  useEffect(() => {
    const productParam = searchParams.get('product');
    const storedProduct = typeof window !== 'undefined' ? localStorage.getItem('selectedProduct') : null;
    const product = productParam || storedProduct;

    if (product) {
      setSelectedProductType(product);
      if (studioModels.length > 0 && !studioOpen) {
        // Has models → open Studio with product pre-selected, clear storage
        setSelectedModel(studioModels[0]);
        setStudioOpen(true);
        trackStudioOpened();
        localStorage.removeItem('selectedProduct');
      }
      // If no models, don't clear localStorage — product selection survives training wait
      // Upload section is shown at the top for new users, no scroll needed
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openStudio = useCallback((model: StudioModel, productType?: string) => {
    setSelectedModel(model);
    if (productType) setSelectedProductType(productType);
    setStudioOpen(true);
    trackStudioOpened();
  }, []);

  const closeStudio = useCallback(() => {
    setStudioOpen(false);
    setSelectedModel(null);
    setSelectedProductType(null);
  }, []);

  const handlePortraitSelected = useCallback(async (portrait: StudioPortraitResult) => {
    // Save the portrait to the database
    try {
      await fetch('/api/studio/save-portrait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: selectedModel?.id,
          generationId: portrait.generationId,
          imageIndex: portrait.imageIndex,
          imageUrl: portrait.imageUrl,
          sceneId: portrait.sceneId,
        }),
      });
    } catch (err) {
      console.error('Failed to save portrait:', err);
    }

    // Close studio and redirect to print configure
    closeStudio();
    let configureUrl = `/print/configure?image=${encodeURIComponent(portrait.imageUrl)}&generationId=${portrait.generationId}&imageIndex=${portrait.imageIndex}&productType=${encodeURIComponent(portrait.productType)}`;
    if (portrait.mockupUrl) {
      configureUrl += `&mockupUrl=${encodeURIComponent(portrait.mockupUrl)}`;
    }
    window.location.href = configureUrl;
  }, [selectedModel, closeStudio]);

  const handleAddPet = useCallback(() => {
    document.getElementById('my-pets')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const hasModels = studioModels.length > 0;
  const hasPendingTrainings = pendingTrainings.length > 0;
  const isNewUser = !hasModels && !hasPendingTrainings;

  return (
    <>
      <main className="dash-main">
        {loadError && (
          <div style={{
            background: '#2a1a1a',
            border: '1px solid #663333',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#ffaaaa',
            fontSize: '14px',
          }}>
            <span>Some data couldn&apos;t be loaded. Please refresh to try again.</span>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#663333',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '13px',
                flexShrink: 0,
                marginLeft: '12px',
              }}
            >
              Refresh
            </button>
          </div>
        )}
        {isNewUser ? (
          <>
            {/* New user: upload is the hero action */}
            <h1>Let&apos;s get started</h1>
            <p className="dash-subtitle">Upload a few photos of your pet and our AI will learn their unique look for custom portraits.</p>

            <MyPetsSection
              models={modelsWithCounts}
              pendingTrainings={pendingTrainings}
              studioModels={studioModels}
              onOpenStudio={(model) => openStudio(model)}
            />

            <NewOrderSection
              hasModels={false}
              models={studioModels}
              onOpenStudio={openStudio}
              onAddPet={handleAddPet}
            />
          </>
        ) : (
          <>
            {/* Returning user: orders first, then new order, then pets */}
            <h1>Dashboard</h1>
            <p className="dash-subtitle">Welcome back, {user.name || user.email}</p>

            <ActiveOrdersSection
              orders={activeOrders}
              orderItemsMap={orderItemsMap}
            />

            <NewOrderSection
              hasModels={hasModels}
              models={studioModels}
              onOpenStudio={openStudio}
              onAddPet={handleAddPet}
            />

            <OrderHistorySection
              orders={completedOrders}
              orderItemsMap={orderItemsMap}
            />

            <MyPetsSection
              models={modelsWithCounts}
              pendingTrainings={pendingTrainings}
              studioModels={studioModels}
              onOpenStudio={(model) => openStudio(model)}
            />
          </>
        )}
      </main>

      {/* Studio overlay */}
      {studioOpen && selectedModel && (
        <StudioOverlay
          model={selectedModel}
          onClose={closeStudio}
          onPortraitSelected={handlePortraitSelected}
          initialProductType={selectedProductType || undefined}
        />
      )}
    </>
  );
}
