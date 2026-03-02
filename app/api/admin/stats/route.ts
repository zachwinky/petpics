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
  getActiveCartSnapshots,
  getEventFunnelStats,
  getUserEvents,
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
      const sortBy = (searchParams.get('sortBy') || 'created_at') as 'created_at' | 'print_order_total_cents';
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

    if (type === 'active-carts') {
      const carts = await getActiveCartSnapshots();
      return NextResponse.json({ carts });
    }

    if (type === 'funnel') {
      const days = searchParams.get('days');
      const parsedDays = days ? parseInt(days) : undefined;
      const validDays = [7, 30, 90];
      const safeDays = parsedDays && validDays.includes(parsedDays) ? parsedDays : undefined;
      const funnel = await getEventFunnelStats(safeDays);
      return NextResponse.json({ funnel });
    }

    if (type === 'user-events') {
      const userId = searchParams.get('userId');
      if (!userId) {
        return NextResponse.json({ error: 'userId required' }, { status: 400 });
      }
      const events = await getUserEvents(parseInt(userId), 100);
      return NextResponse.json({ events });
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
