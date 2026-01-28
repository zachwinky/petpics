import { Pool } from 'pg';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixGenerationModelLinks() {
  try {
    console.log('Starting migration to link generations to models...\n');

    // Get all generations with null model_id
    const generationsResult = await pool.query(
      'SELECT id, user_id, custom_prompt, image_urls FROM generations WHERE model_id IS NULL ORDER BY created_at DESC'
    );

    console.log(`Found ${generationsResult.rows.length} generations without model links\n`);

    if (generationsResult.rows.length === 0) {
      console.log('No generations to fix!');
      return;
    }

    // Get all models to match against
    const modelsResult = await pool.query(
      'SELECT id, user_id, trigger_word FROM models'
    );

    console.log(`Found ${modelsResult.rows.length} models to match against\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    // Try to match each generation to a model
    for (const generation of generationsResult.rows) {
      // Find a model that belongs to the same user
      const userModels = modelsResult.rows.filter(m => m.user_id === generation.user_id);

      if (userModels.length === 0) {
        console.log(`⚠️  No models found for user ${generation.user_id}, generation ${generation.id}`);
        skippedCount++;
        continue;
      }

      // If user only has one model, link it to that
      if (userModels.length === 1) {
        await pool.query(
          'UPDATE generations SET model_id = $1 WHERE id = $2',
          [userModels[0].id, generation.id]
        );
        console.log(`✓ Linked generation ${generation.id} to model ${userModels[0].id} (${userModels[0].trigger_word}) - only model for user`);
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
        console.log(`✓ Linked generation ${generation.id} to model ${matchedModel.id} (${matchedModel.trigger_word}) - matched by trigger word`);
        updatedCount++;
      } else {
        // Link to the user's most recent model as fallback
        const mostRecentModel = userModels[0]; // Already ordered by trigger_word, use first
        await pool.query(
          'UPDATE generations SET model_id = $1 WHERE id = $2',
          [mostRecentModel.id, generation.id]
        );
        console.log(`✓ Linked generation ${generation.id} to model ${mostRecentModel.id} (${mostRecentModel.trigger_word}) - fallback to first model`);
        updatedCount++;
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log(`   Total: ${generationsResult.rows.length}`);

  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration
fixGenerationModelLinks().catch(console.error);
