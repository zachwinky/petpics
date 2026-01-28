import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdmin, getUserDetail, addCreditsToUser } from '@/lib/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const userId = parseInt(id);

    const userDetail = await getUserDetail(userId);
    if (!userDetail) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user: userDetail });

  } catch (error) {
    console.error('Admin user detail error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const userId = parseInt(id);
    const body = await request.json();

    if (body.action === 'add_credits') {
      const { credits, description } = body;

      if (!credits || credits <= 0) {
        return NextResponse.json(
          { error: 'Invalid credits amount' },
          { status: 400 }
        );
      }

      await addCreditsToUser(userId, credits, description || 'Admin credit adjustment');

      return NextResponse.json({
        success: true,
        message: `Added ${credits} credits to user`
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Admin user action error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
