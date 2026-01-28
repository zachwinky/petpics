import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  },
});

export async function POST() {
  try {
    console.log('Starting migration to link generations to models...');

    // Get all generations with null model_id
    const generationsResult = await pool.query(
      'SELECT id, user_id, custom_prompt, image_urls FROM generations WHERE model_id IS NULL ORDER BY created_at DESC'
    );

    const generations = generationsResult.rows;
    console.log(`Found ${generations.length} generations without model links`);

    if (generations.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No generations to fix!',
        updated: 0,
        skipped: 0,
      });
    }

    // Get all models to match against
    const modelsResult = await pool.query(
      'SELECT id, user_id, trigger_word FROM models'
    );

    const models = modelsResult.rows;
    console.log(`Found ${models.length} models to match against`);

    let updatedCount = 0;
    let skippedCount = 0;
    const updates: string[] = [];

    // Try to match each generation to a model
    for (const generation of generations) {
      // Find models that belong to the same user
      const userModels = models.filter((m: any) => m.user_id === generation.user_id);

      if (userModels.length === 0) {
        console.log(`No models found for user ${generation.user_id}, generation ${generation.id}`);
        updates.push(`⚠️  Skipped generation ${generation.id} - no models for user`);
        skippedCount++;
        continue;
      }

      // If user only has one model, link it to that
      if (userModels.length === 1) {
        await pool.query(
          'UPDATE generations SET model_id = $1 WHERE id = $2',
          [userModels[0].id, generation.id]
        );
        updates.push(`✓ Linked generation ${generation.id} to model ${userModels[0].id} (${userModels[0].trigger_word}) - only model for user`);
        updatedCount++;
        continue;
      }

      // If user has multiple models, try to match by trigger word in prompt
      let matchedModel = null;

      if (generation.custom_prompt) {
        for (const model of userModels) {
          if (generation.custom_prompt.toLowerCase().includes(model.trigger_word.toLowerCase())) {
            matchedModel = model;
            break;
          }
        }
      }

      if (matchedModel) {
        await pool.query(
          'UPDATE generations SET model_id = $1 WHERE id = $2',
          [matchedModel.id, generation.id]
        );
        updates.push(`✓ Linked generation ${generation.id} to model ${matchedModel.id} (${matchedModel.trigger_word}) - matched by trigger word`);
        updatedCount++;
      } else {
        // Link to the user's first model as fallback
        const fallbackModel = userModels[0];
        await pool.query(
          'UPDATE generations SET model_id = $1 WHERE id = $2',
          [fallbackModel.id, generation.id]
        );
        updates.push(`✓ Linked generation ${generation.id} to model ${fallbackModel.id} (${fallbackModel.trigger_word}) - fallback to first model`);
        updatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Migration complete!',
      updated: updatedCount,
      skipped: skippedCount,
      total: generations.length,
      details: updates,
    });

  } catch (error) {
    console.error('Error during migration:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
