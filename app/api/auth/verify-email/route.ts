import { NextRequest, NextResponse } from 'next/server';
import { getUserByVerificationToken, verifyUserEmail } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    // Find user by verification token
    const user = await getUserByVerificationToken(token);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }

    // Check if already verified
    if (user.email_verified) {
      return NextResponse.json({
        success: true,
        message: 'Email already verified',
        alreadyVerified: true,
      });
    }

    // Verify the user's email
    await verifyUserEmail(user.id);

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully! You can now sign in.',
    });

  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify email', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
