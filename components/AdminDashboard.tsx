'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface AdminStats {
  totalUsers: number;
  totalCreditsIssued: number;
  totalCreditsSpent: number;
  totalRevenue: number;
  totalModels: number;
  totalGenerations: number;
  recentSignups: number;
  recentRevenue: number;
}

interface UserSummary {
  id: number;
  email: string;
  name: string | null;
  credits_balance: number;
  total_spent: number;
  total_purchased: number;
  models_count: number;
  generations_count: number;
  created_at: string;
  last_activity: string | null;
}

interface PendingTraining {
  id: number;
  user_id: number;
  user_email: string;
  trigger_word: string;
  model_name: string | null;
  status: 'training' | 'completed' | 'failed';
  error_message: string | null;
  images_count: number;
  created_at: string;
  completed_at: string | null;
}

interface VideoGeneration {
  id: number;
  user_id: number;
  user_email: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  credits_used: number;
  created_at: string;
  completed_at: string | null;
}

interface PrintOrderSummary {
  id: number;
  user_email: string;
  status: string;
  total_cents: number;
  item_count: number;
  printful_order_id: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  created_at: string;
}

interface PrintOrderDetail {
  order: PrintOrderSummary & {
    shipping_name: string;
    shipping_address_1: string;
    shipping_address_2?: string;
    shipping_city: string;
    shipping_state?: string;
    shipping_zip: string;
    shipping_country: string;
    stripe_payment_intent_id: string;
    subtotal_cents: number;
    shipping_cents: number;
    tax_cents: number;
  };
  items: {
    id: number;
    image_url: string;
    product_type: string;
    product_size: string;
    printful_variant_id: number;
    unit_price_cents: number;
    quantity: number;
    generation_id?: number;
    image_index: number;
    product_options: Record<string, unknown>;
  }[];
  user: { id: number; email: string; name: string | null } | null;
}

interface FailureCounts {
  failedTrainings: number;
  failedVideos: number;
  pendingTrainings: number;
  pendingVideos: number;
}

interface ReengagementUser {
  id: number;
  email: string;
  name: string | null;
  pet_names: string[];
  training_date: string;
  last_activity: string | null;
  reengagement_sent_at: string | null;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'created_at' | 'credits_balance' | 'total_spent'>('created_at');
  const [order, setOrder] = useState<'ASC' | 'DESC'>('DESC');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Pending trainings state
  const [pendingTrainings, setPendingTrainings] = useState<PendingTraining[]>([]);
  const [refundingId, setRefundingId] = useState<number | null>(null);

  // Videos state
  const [videos, setVideos] = useState<VideoGeneration[]>([]);
  const [videoFilter, setVideoFilter] = useState<'all' | 'pending' | 'processing' | 'failed'>('all');

  // Print orders state
  const [printOrders, setPrintOrders] = useState<PrintOrderSummary[]>([]);
  const [printOrdersSectionOpen, setPrintOrdersSectionOpen] = useState(false);
  const [printOrdersLoading, setPrintOrdersLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [expandedOrderDetail, setExpandedOrderDetail] = useState<PrintOrderDetail | null>(null);
  const [expandedOrderLoading, setExpandedOrderLoading] = useState(false);
  const [orderActionLoading, setOrderActionLoading] = useState<string | null>(null);

  // Failure counts
  const [failureCounts, setFailureCounts] = useState<FailureCounts | null>(null);

  // Add Model form state
  const [showAddModel, setShowAddModel] = useState(false);
  const [addModelForm, setAddModelForm] = useState({
    userId: '',
    loraUrl: '',
    triggerWord: '',
    trainingImagesCount: '5',
  });
  const [addModelLoading, setAddModelLoading] = useState(false);
  const [addModelMessage, setAddModelMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Quick credits state
  const [addingCreditsUserId, setAddingCreditsUserId] = useState<number | null>(null);

  // Sample prompts config state
  const [samplePromptIds, setSamplePromptIds] = useState<string[]>([]);
  const [availablePresets, setAvailablePresets] = useState<{ id: string; label: string; description: string }[]>([]);
  const [savingSampleConfig, setSavingSampleConfig] = useState(false);
  const [sampleSectionOpen, setSampleSectionOpen] = useState(false);

  // Hero gallery config state
  const [gallerySectionOpen, setGallerySectionOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState<{ url: string; alt: string }[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageAlt, setNewImageAlt] = useState('');
  const [savingGallery, setSavingGallery] = useState(false);

  // Re-engagement state
  const [reengagementSectionOpen, setReengagementSectionOpen] = useState(false);
  const [reengagementUsers, setReengagementUsers] = useState<ReengagementUser[]>([]);
  const [reengagementLoading, setReengagementLoading] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [sendingReengagement, setSendingReengagement] = useState(false);
  const [reengagementBatchSize, setReengagementBatchSize] = useState(10);
  const [reengagementResult, setReengagementResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load stats
      const statsRes = await fetch('/api/admin/stats');
      const statsData = await statsRes.json();
      setStats(statsData.stats);

      // Load users
      const usersRes = await fetch(`/api/admin/stats?type=users&sortBy=${sortBy}&order=${order}&limit=50`);
      const usersData = await usersRes.json();
      setUsers(usersData.users);

      // Load pending trainings
      const trainingsRes = await fetch('/api/admin/stats?type=pending-trainings');
      const trainingsData = await trainingsRes.json();
      setPendingTrainings(trainingsData.trainings || []);

      // Load videos
      const videosRes = await fetch('/api/admin/stats?type=videos');
      const videosData = await videosRes.json();
      setVideos(videosData.videos || []);

      // Load failure counts
      const countsRes = await fetch('/api/admin/stats?type=failure-counts');
      const countsData = await countsRes.json();
      setFailureCounts(countsData.counts);

      // Load sample prompts config
      const sampleConfigRes = await fetch('/api/admin/sample-config');
      if (sampleConfigRes.ok) {
        const sampleConfigData = await sampleConfigRes.json();
        setSamplePromptIds(sampleConfigData.samplePromptIds || []);
        setAvailablePresets(sampleConfigData.availablePresets || []);
      }

      // Load hero gallery config
      const galleryRes = await fetch('/api/admin/gallery-config');
      if (galleryRes.ok) {
        const galleryData = await galleryRes.json();
        setGalleryImages(galleryData.images || []);
      }
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  }, [sortBy, order]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Search users
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        // Reset to normal user list
        const usersRes = await fetch(`/api/admin/stats?type=users&sortBy=${sortBy}&order=${order}&limit=50`);
        const usersData = await usersRes.json();
        setUsers(usersData.users);
        return;
      }

      setIsSearching(true);
      try {
        const res = await fetch(`/api/admin/stats?type=users&search=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setUsers(data.users || []);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, sortBy, order]);

  // Handle refund
  const handleRefund = async (trainingId: number) => {
    if (!confirm('Are you sure you want to refund 5 credits for this failed training?')) return;

    setRefundingId(trainingId);
    try {
      const res = await fetch(`/api/admin/trainings/${trainingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refund' }),
      });
      const data = await res.json();

      if (res.ok) {
        alert(data.message);
        loadData(); // Refresh data
      } else {
        alert(data.error || 'Refund failed');
      }
    } catch (error) {
      alert('Network error');
    } finally {
      setRefundingId(null);
    }
  };

  // Handle quick add credits
  const handleQuickAddCredits = async (userId: number, userEmail: string) => {
    setAddingCreditsUserId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_credits',
          credits: 5,
          description: 'Quick add by admin',
        }),
      });

      if (res.ok) {
        // Update local state
        setUsers(prev =>
          prev.map(u =>
            u.id === userId
              ? { ...u, credits_balance: u.credits_balance + 5, total_purchased: u.total_purchased + 5 }
              : u
          )
        );
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add credits');
      }
    } catch (error) {
      alert('Network error');
    } finally {
      setAddingCreditsUserId(null);
    }
  };

  // Toggle sample prompt selection
  const toggleSamplePrompt = (promptId: string) => {
    setSamplePromptIds(prev => {
      if (prev.includes(promptId)) {
        return prev.filter(id => id !== promptId);
      } else if (prev.length < 2) {
        return [...prev, promptId];
      }
      return prev; // Can't add more than 2
    });
  };

  // Save sample prompt config
  const saveSampleConfig = async () => {
    if (samplePromptIds.length !== 2) {
      alert('Please select exactly 2 prompts');
      return;
    }

    setSavingSampleConfig(true);
    try {
      const res = await fetch('/api/admin/sample-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ samplePromptIds }),
      });

      if (res.ok) {
        alert('Sample prompts config saved successfully!');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save config');
      }
    } catch (error) {
      alert('Network error');
    } finally {
      setSavingSampleConfig(false);
    }
  };

  // Gallery management functions
  const addGalleryImage = () => {
    if (!newImageUrl.trim() || !newImageAlt.trim()) return;
    setGalleryImages(prev => [...prev, { url: newImageUrl.trim(), alt: newImageAlt.trim() }]);
    setNewImageUrl('');
    setNewImageAlt('');
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages(prev => prev.filter((_, i) => i !== index));
  };

  const moveGalleryImage = (index: number, direction: 'up' | 'down') => {
    setGalleryImages(prev => {
      const newArr = [...prev];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= newArr.length) return prev;
      [newArr[index], newArr[newIndex]] = [newArr[newIndex], newArr[index]];
      return newArr;
    });
  };

  const saveGalleryConfig = async () => {
    setSavingGallery(true);
    try {
      const res = await fetch('/api/admin/gallery-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: galleryImages }),
      });
      if (res.ok) {
        alert('Gallery saved!');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save gallery');
      }
    } catch {
      alert('Network error');
    } finally {
      setSavingGallery(false);
    }
  };

  // Re-engagement functions
  const loadReengagementUsers = useCallback(async () => {
    setReengagementLoading(true);
    try {
      const res = await fetch('/api/admin/reengagement');
      const data = await res.json();
      setReengagementUsers(data.users || []);
      const unsent = (data.users || [])
        .filter((u: ReengagementUser) => !u.reengagement_sent_at)
        .map((u: ReengagementUser) => u.id);
      setSelectedUserIds(new Set(unsent));
    } catch (error) {
      console.error('Failed to load reengagement users:', error);
    } finally {
      setReengagementLoading(false);
    }
  }, []);

  const loadPrintOrders = useCallback(async () => {
    setPrintOrdersLoading(true);
    try {
      const res = await fetch('/api/admin/orders');
      const data = await res.json();
      setPrintOrders(data.orders || []);
    } catch (error) {
      console.error('Failed to load print orders:', error);
    } finally {
      setPrintOrdersLoading(false);
    }
  }, []);

  const togglePrintOrdersSection = useCallback(() => {
    const willOpen = !printOrdersSectionOpen;
    setPrintOrdersSectionOpen(willOpen);
    if (willOpen && printOrders.length === 0) {
      loadPrintOrders();
    }
  }, [printOrdersSectionOpen, printOrders.length, loadPrintOrders]);

  const handleUpdateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        loadPrintOrders();
      } else {
        alert(data.error || 'Failed to update order');
      }
    } catch {
      alert('Network error');
    }
  };

  const toggleOrderExpansion = async (orderId: number) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      setExpandedOrderDetail(null);
      return;
    }
    setExpandedOrderId(orderId);
    setExpandedOrderLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`);
      const data = await res.json();
      if (res.ok) {
        setExpandedOrderDetail(data);
      } else {
        alert(data.error || 'Failed to load order detail');
        setExpandedOrderId(null);
      }
    } catch {
      alert('Network error loading order detail');
      setExpandedOrderId(null);
    } finally {
      setExpandedOrderLoading(false);
    }
  };

  const handleRetryPrintful = async (orderId: number) => {
    if (!confirm(`Retry Printful submission for order #${orderId}? This will re-upscale images and create a new Printful order.`)) return;
    setOrderActionLoading(`retry-${orderId}`);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/retry-printful`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(`Printful order created: ${data.printfulOrderId}`);
        loadPrintOrders();
        toggleOrderExpansion(orderId); // Refresh detail
      } else {
        alert(data.error || 'Retry failed');
      }
    } catch {
      alert('Network error');
    } finally {
      setOrderActionLoading(null);
    }
  };

  const handleReorder = async (orderId: number) => {
    if (!confirm(`Create a NEW Printful order for #${orderId}? This resubmits with the same images and address.`)) return;
    setOrderActionLoading(`reorder-${orderId}`);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/reorder`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(`New Printful order created: ${data.printfulOrderId}`);
        loadPrintOrders();
        toggleOrderExpansion(orderId);
      } else {
        alert(data.error || 'Reorder failed');
      }
    } catch {
      alert('Network error');
    } finally {
      setOrderActionLoading(null);
    }
  };

  const copyImageUrls = (items: PrintOrderDetail['items']) => {
    const urls = items.map(item => item.image_url).join('\n');
    navigator.clipboard.writeText(urls);
    alert(`Copied ${items.length} image URL(s) to clipboard`);
  };

  const toggleReengagementSection = useCallback(() => {
    const willOpen = !reengagementSectionOpen;
    setReengagementSectionOpen(willOpen);
    if (willOpen && reengagementUsers.length === 0) {
      loadReengagementUsers();
    }
  }, [reengagementSectionOpen, reengagementUsers.length, loadReengagementUsers]);

  const toggleUserSelection = (userId: number) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === reengagementUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(reengagementUsers.map(u => u.id)));
    }
  };

  const handleSendReengagement = async () => {
    if (selectedUserIds.size === 0) return;
    const userIds = Array.from(selectedUserIds).slice(0, reengagementBatchSize);
    if (!confirm(`Send re-engagement emails to ${userIds.length} users? This will generate fresh sample images for each user (~30s each).`)) return;

    setSendingReengagement(true);
    setReengagementResult(null);

    try {
      const res = await fetch('/api/admin/reengagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds }),
      });
      const data = await res.json();

      if (res.ok) {
        setReengagementResult({
          type: 'success',
          text: `${data.successCount} sent, ${data.errorCount} failed`,
        });
        await loadReengagementUsers();
      } else {
        setReengagementResult({
          type: 'error',
          text: data.error || 'Failed to send emails',
        });
      }
    } catch {
      setReengagementResult({ type: 'error', text: 'Network error' });
    } finally {
      setSendingReengagement(false);
    }
  };

  // Handle video status update
  const handleVideoStatusUpdate = async (videoId: number, newStatus: string) => {
    const errorMessage = newStatus === 'failed' ? prompt('Error message (optional):') : undefined;

    try {
      const res = await fetch(`/api/admin/videos/${videoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_status',
          status: newStatus,
          errorMessage: errorMessage || undefined,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        alert(data.message);
        loadData(); // Refresh data
      } else {
        alert(data.error || 'Status update failed');
      }
    } catch (error) {
      alert('Network error');
    }
  };

  // Handle training status update
  const handleTrainingStatusUpdate = async (trainingId: number, newStatus: string) => {
    const errorMessage = newStatus === 'failed' ? prompt('Error message (optional):') : undefined;

    try {
      const res = await fetch(`/api/admin/trainings/${trainingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_status',
          status: newStatus,
          errorMessage: errorMessage || undefined,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        alert(data.message);
        loadData(); // Refresh data
      } else {
        alert(data.error || 'Status update failed');
      }
    } catch (error) {
      alert('Network error');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleSort = (column: 'created_at' | 'credits_balance' | 'total_spent') => {
    if (sortBy === column) {
      setOrder(order === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(column);
      setOrder('DESC');
    }
  };

  const handleAddModel = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddModelLoading(true);
    setAddModelMessage(null);

    try {
      const response = await fetch('/api/admin/add-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: addModelForm.userId,
          loraUrl: addModelForm.loraUrl,
          triggerWord: addModelForm.triggerWord,
          trainingImagesCount: parseInt(addModelForm.trainingImagesCount),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAddModelMessage({ type: 'success', text: data.message });
        setAddModelForm({ userId: '', loraUrl: '', triggerWord: '', trainingImagesCount: '5' });
        loadData(); // Refresh stats
      } else {
        setAddModelMessage({ type: 'error', text: data.error || 'Failed to add model' });
      }
    } catch (error) {
      setAddModelMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setAddModelLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Model Section */}
      <div className="bg-white rounded-lg shadow">
        <button
          onClick={() => setShowAddModel(!showAddModel)}
          className="w-full px-6 py-4 flex items-center justify-between text-left"
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Recover Lost Training</h2>
            <p className="text-sm text-gray-500">Manually add a model from FAL if training flow failed</p>
          </div>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${showAddModel ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAddModel && (
          <div className="px-6 pb-6 border-t border-gray-200 pt-4">
            <form onSubmit={handleAddModel} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                  <input
                    type="number"
                    value={addModelForm.userId}
                    onChange={(e) => setAddModelForm({ ...addModelForm, userId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                    placeholder="e.g., 1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Word</label>
                  <input
                    type="text"
                    value={addModelForm.triggerWord}
                    onChange={(e) => setAddModelForm({ ...addModelForm, triggerWord: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                    placeholder="e.g., MYPRODUCT"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">LoRA URL (from FAL)</label>
                <input
                  type="url"
                  value={addModelForm.loraUrl}
                  onChange={(e) => setAddModelForm({ ...addModelForm, loraUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  placeholder="https://fal.media/files/..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get this from the FAL dashboard under your completed training jobs
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Training Images Count</label>
                <input
                  type="number"
                  value={addModelForm.trainingImagesCount}
                  onChange={(e) => setAddModelForm({ ...addModelForm, trainingImagesCount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  min="5"
                  max="20"
                />
              </div>

              {addModelMessage && (
                <div className={`p-3 rounded-lg ${addModelMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  {addModelMessage.text}
                </div>
              )}

              <button
                type="submit"
                disabled={addModelLoading}
                className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {addModelLoading ? 'Adding...' : 'Add Model'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Sample Prompts Config */}
      <div className="bg-white rounded-lg shadow">
        <button
          onClick={() => setSampleSectionOpen(!sampleSectionOpen)}
          className="w-full px-6 py-4 flex items-center justify-between text-left border-b border-gray-200"
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Training Completion Samples</h2>
            <p className="text-sm text-gray-500">Select 2 prompts to generate watermarked samples when training completes (shown in email)</p>
          </div>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform flex-shrink-0 ml-4 ${sampleSectionOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {sampleSectionOpen && (
          <div className="px-6 py-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
              {availablePresets.map(preset => {
                const isSelected = samplePromptIds.includes(preset.id);
                const canSelect = isSelected || samplePromptIds.length < 2;
                return (
                  <button
                    key={preset.id}
                    onClick={() => toggleSamplePrompt(preset.id)}
                    disabled={!canSelect}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-coral-500 bg-coral-50 text-coral-700'
                        : canSelect
                          ? 'border-gray-200 hover:border-coral-300 hover:bg-coral-50/50'
                          : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <div className="font-medium text-sm">{preset.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{preset.description}</div>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {samplePromptIds.length}/2 selected
                {samplePromptIds.length === 2 && <span className="text-green-600 ml-2">Ready to save</span>}
              </span>
              <button
                onClick={saveSampleConfig}
                disabled={samplePromptIds.length !== 2 || savingSampleConfig}
                className="px-4 py-2 bg-coral-500 text-white font-medium rounded-lg hover:bg-coral-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {savingSampleConfig ? 'Saving...' : 'Save Config'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hero Gallery Config */}
      <div className="bg-white rounded-lg shadow">
        <button
          onClick={() => setGallerySectionOpen(!gallerySectionOpen)}
          className="w-full px-6 py-4 flex items-center justify-between text-left border-b border-gray-200"
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Landing Page Gallery</h2>
            <p className="text-sm text-gray-500">Manage the example images shown on the landing page ({galleryImages.length} images)</p>
          </div>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform flex-shrink-0 ml-4 ${gallerySectionOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {gallerySectionOpen && (
          <div className="px-6 py-4 space-y-4">
            {/* Add new image */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Image URL"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <input
                type="text"
                value={newImageAlt}
                onChange={(e) => setNewImageAlt(e.target.value)}
                placeholder="Description (e.g. Golden retriever in park)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <button
                onClick={addGalleryImage}
                disabled={!newImageUrl.trim() || !newImageAlt.trim()}
                className="px-4 py-2 bg-coral-500 text-white font-medium rounded-lg hover:bg-coral-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm whitespace-nowrap"
              >
                Add Image
              </button>
            </div>

            {/* Image list */}
            {galleryImages.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No gallery images yet. Add some above.</p>
            ) : (
              <div className="space-y-2">
                {galleryImages.map((img, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <img src={img.url} alt={img.alt} className="w-16 h-20 object-cover rounded" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{img.alt}</p>
                      <p className="text-xs text-gray-500 truncate">{img.url}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => moveGalleryImage(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-gray-500 hover:text-gray-700 disabled:text-gray-300"
                        title="Move up"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveGalleryImage(index, 'down')}
                        disabled={index === galleryImages.length - 1}
                        className="p-1 text-gray-500 hover:text-gray-700 disabled:text-gray-300"
                        title="Move down"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => removeGalleryImage(index)}
                        className="p-1 text-red-500 hover:text-red-700"
                        title="Remove"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Save button */}
            <div className="flex justify-end">
              <button
                onClick={saveGalleryConfig}
                disabled={savingGallery}
                className="px-4 py-2 bg-coral-500 text-white font-medium rounded-lg hover:bg-coral-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {savingGallery ? 'Saving...' : 'Save Gallery'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Re-engagement Emails */}
      <div className="bg-white rounded-lg shadow">
        <button
          onClick={toggleReengagementSection}
          className="w-full px-6 py-4 flex items-center justify-between text-left border-b border-gray-200"
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Re-engagement Emails</h2>
            <p className="text-sm text-gray-500">Send emails with sample images to users who trained a model but never purchased</p>
          </div>
          <svg className={`w-5 h-5 text-gray-500 transition-transform flex-shrink-0 ml-4 ${reengagementSectionOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {reengagementSectionOpen && (
          <div className="px-6 py-4">
            {reengagementLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
            ) : reengagementUsers.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No eligible users found (all users with trained models have purchased credits).</p>
            ) : (
              <>
                {/* Controls */}
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">{selectedUserIds.size} of {reengagementUsers.length} selected</span>
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      Batch:
                      <select value={reengagementBatchSize} onChange={(e) => setReengagementBatchSize(Number(e.target.value))} className="px-2 py-1 border border-gray-300 rounded text-sm">
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                      </select>
                    </label>
                  </div>
                  <button
                    onClick={handleSendReengagement}
                    disabled={sendingReengagement || selectedUserIds.size === 0}
                    className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                  >
                    {sendingReengagement ? 'Sending... (this takes a while)' : `Send to ${Math.min(selectedUserIds.size, reengagementBatchSize)} users`}
                  </button>
                </div>

                {reengagementResult && (
                  <div className={`p-3 rounded-lg mb-4 ${reengagementResult.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    {reengagementResult.text}
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <input type="checkbox" checked={selectedUserIds.size === reengagementUsers.length && reengagementUsers.length > 0} onChange={toggleSelectAll} className="rounded border-gray-300" />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pet Name(s)</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trained</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Active</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reengagementUsers.map((user) => {
                        const wasSent = !!user.reengagement_sent_at;
                        return (
                          <tr key={user.id} className={`hover:bg-gray-50 ${wasSent ? 'bg-gray-50 opacity-60' : ''}`}>
                            <td className="px-4 py-3">
                              <input type="checkbox" checked={selectedUserIds.has(user.id)} onChange={() => toggleUserSelection(user.id)} className="rounded border-gray-300" />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{user.email}</div>
                              {user.name && <div className="text-sm text-gray-500">{user.name}</div>}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900">{user.pet_names.join(', ')}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatDate(user.training_date)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatDate(user.last_activity)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              {wasSent ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Sent {formatDate(user.reengagement_sent_at)}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                  Not sent
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Print Orders */}
      <div className="bg-white rounded-lg shadow">
        <button
          onClick={togglePrintOrdersSection}
          className="w-full px-6 py-4 flex items-center justify-between text-left border-b border-gray-200"
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Print Orders</h2>
            <p className="text-sm text-gray-500">Manage physical print orders and fulfillment status</p>
          </div>
          <svg className={`w-5 h-5 text-gray-500 transition-transform flex-shrink-0 ml-4 ${printOrdersSectionOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {printOrdersSectionOpen && (
          <div className="px-6 py-4">
            {printOrdersLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
            ) : printOrders.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No print orders yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Printful</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {printOrders.map((order) => (
                      <React.Fragment key={order.id}>
                        <tr
                          className={`hover:bg-gray-50 cursor-pointer ${expandedOrderId === order.id ? 'bg-indigo-50' : ''}`}
                          onClick={() => toggleOrderExpansion(order.id)}
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            <span className="inline-flex items-center gap-1">
                              <svg className={`w-3 h-3 transition-transform ${expandedOrderId === order.id ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                              #{order.id}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{order.user_email}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{order.item_count}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(order.total_cents / 100)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                              order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                              order.status === 'in_production' ? 'bg-yellow-100 text-yellow-800' :
                              order.status === 'submitted_to_printful' ? 'bg-indigo-100 text-indigo-800' :
                              order.status === 'failed' || order.status === 'refunded' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {order.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {order.printful_order_id || '-'}
                            {order.tracking_number && (
                              <div className="text-xs text-blue-600">
                                {order.tracking_url ? (
                                  <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="hover:underline" onClick={e => e.stopPropagation()}>
                                    {order.tracking_number}
                                  </a>
                                ) : order.tracking_number}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatDate(order.created_at)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm" onClick={e => e.stopPropagation()}>
                            <div className="flex gap-1 flex-wrap">
                              {order.status === 'payment_confirmed' && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id, 'failed')}
                                  className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                                >
                                  Fail
                                </button>
                              )}
                              {order.status === 'shipped' && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                                  className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                >
                                  Delivered
                                </button>
                              )}
                              {(order.status === 'failed' || order.status === 'payment_confirmed') && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id, 'refunded')}
                                  className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                                >
                                  Refund
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {/* Expanded order detail */}
                        {expandedOrderId === order.id && (
                          <tr>
                            <td colSpan={8} className="px-4 py-4 bg-gray-50 border-t border-b border-gray-200">
                              {expandedOrderLoading ? (
                                <div className="flex justify-center py-4">
                                  <div className="w-6 h-6 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                                </div>
                              ) : expandedOrderDetail ? (
                                <div className="space-y-4">
                                  {/* Items with thumbnails */}
                                  <div>
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Items</h4>
                                    <div className="grid gap-3">
                                      {expandedOrderDetail.items.map(item => (
                                        <div key={item.id} className="flex items-start gap-3 bg-white p-3 rounded-lg border border-gray-100">
                                          <a href={item.image_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                                            <img src={item.image_url} alt="" className="w-16 h-16 rounded object-cover border border-gray-200" />
                                          </a>
                                          <div className="flex-1 min-w-0 text-xs">
                                            <div className="font-medium text-gray-900">{item.product_type} — {item.product_size}</div>
                                            <div className="text-gray-500">Variant: {item.printful_variant_id} | Qty: {item.quantity}</div>
                                            <div className="text-gray-500">Price: ${(item.unit_price_cents / 100).toFixed(2)}</div>
                                            {item.generation_id && (
                                              <div className="text-gray-500">Gen: #{item.generation_id} img[{item.image_index}]</div>
                                            )}
                                            {(item.product_options as Record<string, string>)?.frameColor && (
                                              <div className="text-gray-500">Frame: {(item.product_options as Record<string, string>).frameColor}</div>
                                            )}
                                            <button
                                              onClick={() => { navigator.clipboard.writeText(item.image_url); alert('Image URL copied'); }}
                                              className="mt-1 text-indigo-600 hover:text-indigo-800 underline"
                                            >
                                              Copy image URL
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Shipping address */}
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Shipping Address</h4>
                                      <div className="text-xs text-gray-700 space-y-0.5">
                                        <div>{expandedOrderDetail.order.shipping_name}</div>
                                        <div>{expandedOrderDetail.order.shipping_address_1}</div>
                                        {expandedOrderDetail.order.shipping_address_2 && <div>{expandedOrderDetail.order.shipping_address_2}</div>}
                                        <div>
                                          {expandedOrderDetail.order.shipping_city}
                                          {expandedOrderDetail.order.shipping_state && `, ${expandedOrderDetail.order.shipping_state}`}
                                          {' '}{expandedOrderDetail.order.shipping_zip}
                                        </div>
                                        <div>{expandedOrderDetail.order.shipping_country}</div>
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Payment</h4>
                                      <div className="text-xs text-gray-700 space-y-0.5">
                                        <div>Subtotal: ${(expandedOrderDetail.order.subtotal_cents / 100).toFixed(2)}</div>
                                        <div>Shipping: ${(expandedOrderDetail.order.shipping_cents / 100).toFixed(2)}</div>
                                        <div>Tax: ${(expandedOrderDetail.order.tax_cents / 100).toFixed(2)}</div>
                                        <div className="font-medium">Total: ${(expandedOrderDetail.order.total_cents / 100).toFixed(2)}</div>
                                        <button
                                          onClick={() => { navigator.clipboard.writeText(expandedOrderDetail.order.stripe_payment_intent_id); alert('Stripe PI copied'); }}
                                          className="text-indigo-600 hover:text-indigo-800 underline mt-1 block"
                                        >
                                          Copy Stripe PI
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Action buttons */}
                                  <div className="flex gap-2 pt-2 border-t border-gray-200">
                                    <button
                                      onClick={() => copyImageUrls(expandedOrderDetail.items)}
                                      className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                    >
                                      Copy All Image URLs
                                    </button>
                                    {order.status === 'payment_confirmed' && (
                                      <button
                                        onClick={() => handleRetryPrintful(order.id)}
                                        disabled={orderActionLoading === `retry-${order.id}`}
                                        className="px-3 py-1.5 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 disabled:opacity-50"
                                      >
                                        {orderActionLoading === `retry-${order.id}` ? 'Retrying...' : 'Retry Printful'}
                                      </button>
                                    )}
                                    {(order.status === 'failed' || order.status === 'refunded' || order.status === 'payment_confirmed') && (
                                      <button
                                        onClick={() => handleReorder(order.id)}
                                        disabled={orderActionLoading === `reorder-${order.id}`}
                                        className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                                      >
                                        {orderActionLoading === `reorder-${order.id}` ? 'Reordering...' : 'Reorder'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500 text-center">Failed to load order detail</p>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Total Users</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{stats.totalUsers}</div>
            <div className="mt-1 text-sm text-green-600">+{stats.recentSignups} this week</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Total Revenue</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</div>
            <div className="mt-1 text-sm text-green-600">{formatCurrency(stats.recentRevenue)} this month</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Credits Issued</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{stats.totalCreditsIssued.toLocaleString()}</div>
            <div className="mt-1 text-sm text-gray-500">{stats.totalCreditsSpent.toLocaleString()} spent</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Total Activity</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{stats.totalModels}</div>
            <div className="mt-1 text-sm text-gray-500">{stats.totalGenerations.toLocaleString()} generations</div>
          </div>
        </div>
      )}

      {/* Failure Summary */}
      {failureCounts && (failureCounts.failedTrainings > 0 || failureCounts.failedVideos > 0 || failureCounts.pendingTrainings > 0) && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium text-gray-600">Status:</span>
            {failureCounts.pendingTrainings > 0 && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                {failureCounts.pendingTrainings} training{failureCounts.pendingTrainings !== 1 ? 's' : ''} in progress
              </span>
            )}
            {failureCounts.pendingVideos > 0 && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {failureCounts.pendingVideos} video{failureCounts.pendingVideos !== 1 ? 's' : ''} processing
              </span>
            )}
            {failureCounts.failedTrainings > 0 && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                {failureCounts.failedTrainings} failed training{failureCounts.failedTrainings !== 1 ? 's' : ''} (7d)
              </span>
            )}
            {failureCounts.failedVideos > 0 && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                {failureCounts.failedVideos} failed video{failureCounts.failedVideos !== 1 ? 's' : ''} (7d)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Pending Trainings Section */}
      {pendingTrainings.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Pending & Failed Trainings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trigger Word</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Started</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingTrainings.map((training) => (
                  <tr key={training.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{training.user_email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{training.trigger_word}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        training.status === 'training'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {training.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(training.created_at)}</td>
                    <td className="px-6 py-4 text-sm text-red-600 max-w-xs truncate" title={training.error_message || ''}>
                      {training.error_message || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-1 flex-wrap">
                        {training.status === 'training' && (
                          <>
                            <button
                              onClick={() => handleTrainingStatusUpdate(training.id, 'failed')}
                              className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                              title="Mark as failed"
                            >
                              Fail
                            </button>
                            <button
                              onClick={() => handleTrainingStatusUpdate(training.id, 'completed')}
                              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                              title="Mark as completed"
                            >
                              Complete
                            </button>
                          </>
                        )}
                        {training.status === 'failed' && !training.error_message?.includes('[REFUNDED]') && (
                          <button
                            onClick={() => handleRefund(training.id)}
                            disabled={refundingId === training.id}
                            className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 disabled:opacity-50"
                          >
                            {refundingId === training.id ? '...' : 'Refund'}
                          </button>
                        )}
                        {training.error_message?.includes('[REFUNDED]') && (
                          <span className="text-green-600 text-xs">Refunded</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Videos Section */}
      {videos.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Video Generations</h2>
            <div className="flex gap-2">
              {(['all', 'pending', 'processing', 'failed'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setVideoFilter(filter)}
                  className={`px-3 py-1 text-sm rounded-full ${
                    videoFilter === filter
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {videos
                  .filter(v => videoFilter === 'all' || v.status === videoFilter)
                  .slice(0, 20)
                  .map((video) => (
                    <tr key={video.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{video.user_email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          video.status === 'completed' ? 'bg-green-100 text-green-800' :
                          video.status === 'failed' ? 'bg-red-100 text-red-800' :
                          video.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {video.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{video.credits_used}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(video.created_at)}</td>
                      <td className="px-6 py-4 text-sm text-red-600 max-w-xs truncate" title={video.error_message || ''}>
                        {video.error_message || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {video.status !== 'completed' && (
                          <div className="flex gap-1">
                            {video.status !== 'failed' && (
                              <button
                                onClick={() => handleVideoStatusUpdate(video.id, 'failed')}
                                className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                                title="Mark as failed"
                              >
                                Fail
                              </button>
                            )}
                            <button
                              onClick={() => handleVideoStatusUpdate(video.id, 'completed')}
                              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                              title="Mark as completed"
                            >
                              Complete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-xl font-semibold text-gray-900">All Users</h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
              />
              <svg
                className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {isSearching && (
                <div className="absolute right-3 top-2.5">
                  <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('credits_balance')}
                >
                  Credits {sortBy === 'credits_balance' && (order === 'DESC' ? '↓' : '↑')}
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('total_spent')}
                >
                  Spent {sortBy === 'total_spent' && (order === 'DESC' ? '↓' : '↑')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('created_at')}
                >
                  Joined {sortBy === 'created_at' && (order === 'DESC' ? '↓' : '↑')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.email}</div>
                    {user.name && <div className="text-sm text-gray-500">{user.name}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.credits_balance}</div>
                    <div className="text-xs text-gray-500">+{user.total_purchased} purchased</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.total_spent}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.models_count} models</div>
                    <div className="text-xs text-gray-500">{user.generations_count} generations</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(user.created_at)}</div>
                    <div className="text-xs text-gray-500">Last: {formatDate(user.last_activity)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleQuickAddCredits(user.id, user.email)}
                        disabled={addingCreditsUserId === user.id}
                        className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                        title="Add 5 credits"
                      >
                        {addingCreditsUserId === user.id ? '...' : '+5'}
                      </button>
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="text-indigo-600 hover:text-indigo-900 font-medium"
                      >
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <div className="px-6 py-8 text-center text-gray-500">
            {searchQuery ? 'No users found matching your search' : 'No users yet'}
          </div>
        )}
      </div>
    </div>
  );
}
