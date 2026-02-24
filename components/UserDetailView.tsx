'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PrintOrder {
  id: number;
  status: string;
  total_cents: number;
  item_count: number;
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
  image_count: number;
  created_at: string;
}

interface UserDetail {
  id: number;
  email: string;
  name: string | null;
  print_order_count: number;
  print_order_total_cents: number;
  models_count: number;
  generations_count: number;
  created_at: string;
  last_activity: string | null;
  printOrders: PrintOrder[];
  models: Model[];
  recentGenerations: Generation[];
}

export default function UserDetailView({ userId }: { userId: string }) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);

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
          {user.print_order_count > 0 && (
            <div className="text-right">
              <div className="text-3xl font-bold text-indigo-600">{formatCurrency(user.print_order_total_cents / 100)}</div>
              <div className="text-sm text-gray-600">{user.print_order_count} order{user.print_order_count !== 1 ? 's' : ''}</div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
          <div>
            <div className="text-sm text-gray-600">Print Orders</div>
            <div className="text-xl font-semibold text-gray-900">{user.print_order_count}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Print Revenue</div>
            <div className="text-xl font-semibold text-gray-900">{formatCurrency(user.print_order_total_cents / 100)}</div>
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

      {/* Print Orders */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Print Orders</h2>
        </div>
        <div className="overflow-x-auto">
          {user.printOrders.length === 0 ? (
            <p className="px-6 py-4 text-gray-500">No print orders yet</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {user.printOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{order.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'failed' || order.status === 'refunded' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.item_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(order.total_cents / 100)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      {formatDate(order.created_at)}
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
