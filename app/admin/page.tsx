import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin';
import NavbarWrapper from '@/components/NavbarWrapper';
import AdminDashboard from '@/components/AdminDashboard';

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user?.email || !isAdmin(session.user.email)) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavbarWrapper />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor users, credits, and system activity</p>
        </div>
        <AdminDashboard />
      </main>
    </div>
  );
}
