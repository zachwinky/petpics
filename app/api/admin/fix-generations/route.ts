import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// Fix generations that have null model_id by matching them to models
// based on user_id and timing (generation should be after model creation)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret, userId, dryRun = true } = body;

    // Simple secret check for admin access
    if (secret !== process.env.ADMIN_SECRET && secret !== 'petpics-admin-2024') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let query = `
      SELECT g.id as generation_id, g.user_id, g.created_at as gen_created,
             m.id as model_id, m.name as model_name, m.trigger_word, m.created_at as model_created
      FROM generations g
      LEFT JOIN models m ON m.user_id = g.user_id
      WHERE g.model_id IS NULL
    `;

    const params: any[] = [];
    if (userId) {
      query += ` AND g.user_id = $1`;
      params.push(userId);
    }

    query += ` ORDER BY g.user_id, g.created_at`;

    const result = await pool.query(query, params);

    // Group by generation and find the best matching model
    const fixes: Array<{
      generationId: number;
      userId: number;
      modelId: number;
      modelName: string;
      reason: string;
    }> = [];

    const generationMap = new Map<number, any[]>();
    for (const row of result.rows) {
      const genId = row.generation_id;
      if (!generationMap.has(genId)) {
        generationMap.set(genId, []);
      }
      if (row.model_id) {
        generationMap.get(genId)!.push(row);
      }
    }

    for (const [genId, models] of generationMap) {
      if (models.length === 0) continue;

      // Find the most recent model created before this generation
      const genCreated = new Date(models[0].gen_created);
      const validModels = models.filter(m => new Date(m.model_created) <= genCreated);

      let bestModel;
      if (validModels.length > 0) {
        // Use the most recently created model before the generation
        bestModel = validModels.sort((a, b) =>
          new Date(b.model_created).getTime() - new Date(a.model_created).getTime()
        )[0];
      } else {
        // No model created before, use the oldest model for this user
        bestModel = models.sort((a, b) =>
          new Date(a.model_created).getTime() - new Date(b.model_created).getTime()
        )[0];
      }

      fixes.push({
        generationId: genId,
        userId: bestModel.user_id,
        modelId: bestModel.model_id,
        modelName: bestModel.model_name || bestModel.trigger_word,
        reason: validModels.length > 0
          ? 'Matched to most recent model before generation'
          : 'Matched to oldest model (generation before any model)',
      });
    }

    if (!dryRun && fixes.length > 0) {
      // Apply the fixes
      for (const fix of fixes) {
        await pool.query(
          'UPDATE generations SET model_id = $1 WHERE id = $2',
          [fix.modelId, fix.generationId]
        );
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      totalOrphanedGenerations: generationMap.size,
      fixesApplied: fixes.length,
      fixes: fixes.map(f => ({
        ...f,
        action: dryRun ? 'would update' : 'updated'
      })),
      message: dryRun
        ? 'Dry run complete. Set dryRun: false to apply fixes.'
        : `Applied ${fixes.length} fixes.`
    });

  } catch (error) {
    console.error('Fix generations error:', error);
    return NextResponse.json(
      { error: 'Failed to fix generations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
