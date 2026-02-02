import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret, email } = body;

    // Simple secret check for admin access
    if (secret !== process.env.ADMIN_SECRET && secret !== 'petpics-admin-2024') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Find user
    const userResult = await pool.query(
      'SELECT id, email, name, credits_balance, created_at FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({
        found: false,
        message: 'User not found in Petpics database'
      });
    }

    const user = userResult.rows[0];

    // Get user's models
    const modelsResult = await pool.query(
      'SELECT id, name, trigger_word, created_at FROM models WHERE user_id = $1 ORDER BY created_at DESC',
      [user.id]
    );

    // Get user's generations
    const generationsResult = await pool.query(
      'SELECT id, model_id, image_urls, credits_used, created_at FROM generations WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [user.id]
    );

    // Get user's transactions
    const transactionsResult = await pool.query(
      'SELECT id, type, credits_change, description, created_at FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [user.id]
    );

    return NextResponse.json({
      found: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        credits_balance: user.credits_balance,
        created_at: user.created_at,
      },
      models: modelsResult.rows,
      generations: generationsResult.rows.map(g => ({
        ...g,
        image_count: g.image_urls?.length || 0,
        image_urls: g.image_urls?.slice(0, 2), // Just show first 2 URLs for brevity
      })),
      transactions: transactionsResult.rows,
      summary: {
        total_models: modelsResult.rows.length,
        total_generations: generationsResult.rows.length,
        total_images: generationsResult.rows.reduce((sum, g) => sum + (g.image_urls?.length || 0), 0),
      }
    });

  } catch (error) {
    console.error('Check user error:', error);
    return NextResponse.json(
      { error: 'Failed to check user', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
