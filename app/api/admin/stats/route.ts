import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  isAdmin,
  getAdminStats,
  getAllUsers,
  searchUsers,
  getPendingTrainings,
  getFailedTrainings,
  getVideoGenerations,
  getFailureCounts,
} from '@/lib/admin';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'users') {
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = parseInt(searchParams.get('offset') || '0');
      const sortBy = (searchParams.get('sortBy') || 'created_at') as 'created_at' | 'credits_balance' | 'total_spent';
      const order = (searchParams.get('order') || 'DESC') as 'ASC' | 'DESC';
      const search = searchParams.get('search');

      // If search query provided, use search function
      if (search && search.trim()) {
        const users = await searchUsers(search.trim(), limit);
        return NextResponse.json({ users });
      }

      const users = await getAllUsers(limit, offset, sortBy, order);
      return NextResponse.json({ users });
    }

    if (type === 'pending-trainings') {
      const trainings = await getPendingTrainings();
      return NextResponse.json({ trainings });
    }

    if (type === 'failed-trainings') {
      const trainings = await getFailedTrainings();
      return NextResponse.json({ trainings });
    }

    if (type === 'videos') {
      const status = searchParams.get('status') as 'pending' | 'processing' | 'completed' | 'failed' | null;
      const videos = await getVideoGenerations(status || undefined);
      return NextResponse.json({ videos });
    }

    if (type === 'failure-counts') {
      const counts = await getFailureCounts();
      return NextResponse.json({ counts });
    }

    // Default: return stats
    const stats = await getAdminStats();
    return NextResponse.json({ stats });

  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
