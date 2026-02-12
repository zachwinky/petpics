import { pool, getUserPendingTrainings, getUserModels } from '../lib/db';

async function diagnose() {
  try {
    console.log('\n=== Diagnosing Stuck Training ===\n');

    // Get all pending trainings
    const pendingResult = await pool.query(
      `SELECT * FROM pending_trainings ORDER BY created_at DESC LIMIT 10`
    );
    console.log('Recent Pending Trainings:');
    console.table(pendingResult.rows);

    // Get recent models
    const modelsResult = await pool.query(
      `SELECT id, user_id, name, trigger_word, preview_image_url, pet_type, created_at
       FROM models
       ORDER BY created_at DESC
       LIMIT 10`
    );
    console.log('\nRecent Models:');
    console.table(modelsResult.rows);

    // Check for models without preview images (indicates sample generation failed)
    const missingPreviewResult = await pool.query(
      `SELECT id, user_id, name, trigger_word, lora_url, created_at
       FROM models
       WHERE preview_image_url IS NULL
       ORDER BY created_at DESC
       LIMIT 5`
    );
    console.log('\nModels Without Preview Images (sample generation may have failed):');
    console.table(missingPreviewResult.rows);

    // Get recent transactions
    const transactionsResult = await pool.query(
      `SELECT id, user_id, type, credits_change, description, created_at
       FROM transactions
       ORDER BY created_at DESC
       LIMIT 10`
    );
    console.log('\nRecent Transactions:');
    console.table(transactionsResult.rows);

  } catch (error) {
    console.error('Error diagnosing:', error);
  } finally {
    await pool.end();
  }
}

diagnose();
