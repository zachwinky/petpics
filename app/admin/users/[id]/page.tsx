import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin';
import NavbarWrapper from '@/components/NavbarWrapper';
import UserDetailView from '@/components/UserDetailView';

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user?.email || !isAdmin(session.user.email)) {
    redirect('/dashboard');
  }

  const { id } = await params;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavbarWrapper />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <UserDetailView userId={id} />
      </main>
    </div>
  );
}
