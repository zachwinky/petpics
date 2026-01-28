'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Transaction {
  id: number;
  type: string;
  credits_change: number;
  amount_usd: number | null;
  description: string | null;
  created_at: string;
}

interface Model {
  id: number;
  name: string;
  trigger_word: string;
  training_images_count: number;
  created_at: string;
}

interface Generation {
  id: number;
  model_id: number | null;
  credits_used: number;
  image_count: number;
  created_at: string;
}

interface UserDetail {
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
  transactions: Transaction[];
  models: Model[];
  recentGenerations: Generation[];
}

export default function UserDetailView({ userId }: { userId: string }) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingCredits, setAddingCredits] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditDescription, setCreditDescription] = useState('');

  useEffect(() => {
    loadUserDetail();
  }, [userId]);

  const loadUserDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const data = await res.json();
      setUser(data.user);
    } catch (error) {
      console.error('Failed to load user detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCredits = async () => {
    const credits = parseInt(creditAmount);
    if (!credits || credits <= 0) return;

    setAddingCredits(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_credits',
          credits,
          description: creditDescription || 'Admin credit adjustment',
        }),
      });

      if (res.ok) {
        setCreditAmount('');
        setCreditDescription('');
        await loadUserDetail();
      }
    } catch (error) {
      console.error('Failed to add credits:', error);
    } finally {
      setAddingCredits(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">User not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/admin"
        className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-medium"
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Admin Dashboard
      </Link>

      {/* User Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{user.email}</h1>
            {user.name && <p className="text-gray-600 mt-1">{user.name}</p>}
            <p className="text-sm text-gray-500 mt-2">
              Joined {formatDate(user.created_at)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-indigo-600">{user.credits_balance}</div>
            <div className="text-sm text-gray-600">Credits Available</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
          <div>
            <div className="text-sm text-gray-600">Total Purchased</div>
            <div className="text-xl font-semibold text-gray-900">{user.total_purchased}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Total Spent</div>
            <div className="text-xl font-semibold text-gray-900">{user.total_spent}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Models Trained</div>
            <div className="text-xl font-semibold text-gray-900">{user.models_count}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Generations</div>
            <div className="text-xl font-semibold text-gray-900">{user.generations_count}</div>
          </div>
        </div>
      </div>

      {/* Add Credits Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Credits</h2>
        <div className="flex gap-4">
          <input
            type="number"
            placeholder="Amount"
            value={creditAmount}
            onChange={(e) => setCreditAmount(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={creditDescription}
            onChange={(e) => setCreditDescription(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            onClick={handleAddCredits}
            disabled={addingCredits || !creditAmount}
            className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {addingCredits ? 'Adding...' : 'Add Credits'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Models */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Models ({user.models.length})</h2>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {user.models.length === 0 ? (
              <p className="px-6 py-4 text-gray-500">No models trained yet</p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <tbody className="divide-y divide-gray-200">
                  {user.models.map((model) => (
                    <tr key={model.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{model.trigger_word}</div>
                        <div className="text-xs text-gray-500">{model.training_images_count} images</div>
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-gray-500">
                        {formatDate(model.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Generations */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Recent Generations</h2>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {user.recentGenerations.length === 0 ? (
              <p className="px-6 py-4 text-gray-500">No generations yet</p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <tbody className="divide-y divide-gray-200">
                  {user.recentGenerations.map((gen) => (
                    <tr key={gen.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{gen.image_count} images</div>
                        <div className="text-xs text-gray-500">{gen.credits_used} credits</div>
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-gray-500">
                        {formatDate(gen.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
        </div>
        <div className="overflow-x-auto">
          {user.transactions.length === 0 ? (
            <p className="px-6 py-4 text-gray-500">No transactions yet</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credits</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {user.transactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                        txn.type === 'purchase' ? 'bg-green-100 text-green-800' :
                        txn.type === 'training' ? 'bg-blue-100 text-blue-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {txn.type}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      txn.credits_change > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {txn.credits_change > 0 ? '+' : ''}{txn.credits_change}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {txn.amount_usd ? formatCurrency(txn.amount_usd) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {txn.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      {formatDate(txn.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
