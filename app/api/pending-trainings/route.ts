import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserPendingTrainings } from '@/lib/db';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = parseInt(session.user.id);
  const pendingTrainings = await getUserPendingTrainings(userId);

  return NextResponse.json({ pendingTrainings });
}
