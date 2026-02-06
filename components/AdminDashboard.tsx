'use client';

import { useState, useEffect, useCallback } from 'react';
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

interface FailureCounts {
  failedTrainings: number;
  failedVideos: number;
  pendingTrainings: number;
  pendingVideos: number;
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
