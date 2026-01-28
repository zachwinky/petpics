import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { rateLimit } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  // Rate limiting: 30 requests per minute per IP
  const rateLimitResult = await rateLimit(request, 30, 60 * 1000);
  if (rateLimitResult.isRateLimited) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: {
          'Retry-After': rateLimitResult.retryAfter.toString(),
        }
      }
    );
  }

  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getUserById(parseInt(session.user.id));
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    credits: user.credits_balance
  });
}
