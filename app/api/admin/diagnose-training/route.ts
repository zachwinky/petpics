import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { pool } from '@/lib/db';
import { isAdmin } from '@/lib/admin';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Admin diagnosing stuck training...');

    // Get all pending trainings
    const pendingResult = await pool.query(
      `SELECT * FROM pending_trainings ORDER BY created_at DESC LIMIT 10`
    );

    // Get recent models (last 10)
    const modelsResult = await pool.query(
      `SELECT id, user_id, name, trigger_word, preview_image_url, pet_type, created_at
       FROM models
       ORDER BY created_at DESC
       LIMIT 10`
    );

    // Check for models without preview images (indicates sample generation failed)
    const missingPreviewResult = await pool.query(
      `SELECT m.id, m.user_id, m.name, m.trigger_word, m.lora_url, m.created_at, u.email
       FROM models m
       JOIN users u ON m.user_id = u.id
       WHERE m.preview_image_url IS NULL
       ORDER BY m.created_at DESC
       LIMIT 5`
    );

    // Get recent transactions (last 20)
    const transactionsResult = await pool.query(
      `SELECT id, user_id, type, credits_change, description, created_at
       FROM transactions
       ORDER BY created_at DESC
       LIMIT 20`
    );

    return NextResponse.json({
      pendingTrainings: pendingResult.rows,
      recentModels: modelsResult.rows,
      modelsWithoutPreview: missingPreviewResult.rows,
      recentTransactions: transactionsResult.rows,
      summary: {
        totalPending: pendingResult.rows.length,
        modelsWithoutPreview: missingPreviewResult.rows.length,
        recommendations: generateRecommendations(
          pendingResult.rows,
          missingPreviewResult.rows
        ),
      },
    });

  } catch (error) {
    console.error('Error diagnosing training:', error);
    return NextResponse.json(
      { error: 'Failed to diagnose', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function generateRecommendations(pendingTrainings: any[], modelsWithoutPreview: any[]): string[] {
  const recommendations: string[] = [];

  if (pendingTrainings.length > 0) {
    recommendations.push(
      `Found ${pendingTrainings.length} pending training(s). Check if FAL training is actually complete by calling /api/pending-trainings endpoint.`
    );
  }

  if (modelsWithoutPreview.length > 0) {
    recommendations.push(
      `Found ${modelsWithoutPreview.length} model(s) without preview images. Sample generation likely failed. Use /api/admin/resend-training-email to regenerate samples and send email.`
    );

    modelsWithoutPreview.forEach((model: any) => {
      recommendations.push(
        `Model ${model.id} (${model.trigger_word}) for user ${model.email}: POST to /api/admin/resend-training-email with body: { "modelId": ${model.id} }`
      );
    });
  }

  if (pendingTrainings.length === 0 && modelsWithoutPreview.length === 0) {
    recommendations.push('No stuck trainings found. Everything looks normal!');
  }

  return recommendations;
}
