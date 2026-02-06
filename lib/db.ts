import { Pool } from 'pg';

// Create a connection pool with proper SSL configuration
export const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: true }  // Enforce SSL certificate validation in production
    : { rejectUnauthorized: false }, // Allow self-signed certs in development
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export interface User {
  id: number;
  email: string;
  name?: string;
  password_hash?: string;
  google_id?: string;
  credits_balance: number;
  email_verified: boolean;
  email_verification_token?: string;
  email_verification_expires?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Model {
  id: number;
  user_id: number;
  name: string;
  lora_url: string;
  trigger_word: string;
  training_images_count: number;
  notes?: string;
  preview_image_url?: string;
  product_description?: string;  // Legacy: AI-generated text description (kept for backward compatibility)
  product_features?: ProductFeatures;  // Comprehensive product features for improved generation accuracy
  pet_type?: 'dog' | 'cat' | 'unknown';  // Detected pet type for prompt selection
  created_at: Date;
}

export interface Generation {
  id: number;
  user_id: number;
  model_id?: number;
  preset_prompt_id?: string;
  custom_prompt?: string;
  image_urls: string[];
  row_prompts?: string[];  // Prompt used for each row of 4 images
  image_quality_scores?: number[];  // CLIP scores for each image (0-1 range)
  credits_used: number;
  reroll_used?: boolean;
  upscale_used?: boolean;  // Whether free upscale has been used for this batch
  aspect_ratio?: string;  // Platform preset ID (e.g., 'instagram-feed', 'instagram-portrait')
  created_at: Date;
}

export interface Transaction {
  id: number;
  user_id: number;
  type: 'purchase' | 'training' | 'generation' | 'video';
  credits_change: number;
  credits_balance_after: number;
  amount_usd?: number;
  stripe_payment_id?: string;
  description?: string;
  created_at: Date;
}

export interface VideoGeneration {
  id: number;
  user_id: number;
  model_id?: number;
  source_image_url: string;
  motion_prompt: string;
  fal_request_id?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  video_url?: string;
  error_message?: string;
  credits_used: number;
  created_at: Date;
  completed_at?: Date;
}

export interface PendingTraining {
  id: number;
  user_id: number;
  fal_request_id: string;
  trigger_word: string;
  model_name: string;
  images_count: number;
  status: 'training' | 'completed' | 'failed';
  error_message?: string;
  pet_type?: 'dog' | 'cat' | 'unknown';
  created_at: Date;
  completed_at?: Date;
}

// Product features for improved generation accuracy
export interface ProductFeature {
  content: string;
  source: 'ai_analysis' | 'reference_image' | 'user_feedback';
  updated_at: string;
}

export interface ProductFeatures {
  text?: ProductFeature;
  shape?: ProductFeature;
  colors?: ProductFeature;
  materials?: ProductFeature;
  distinctive?: ProductFeature;
  user_corrections?: string;
}

// User operations
export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] as User || null;
}

export async function getUserById(id: number): Promise<User | null> {
  const result = await pool.query(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] as User || null;
}

export async function getUserByGoogleId(googleId: string): Promise<User | null> {
  const result = await pool.query(
    'SELECT * FROM users WHERE google_id = $1',
    [googleId]
  );
  return result.rows[0] as User || null;
}

export async function createUser(
  email: string,
  name?: string,
  passwordHash?: string,
  googleId?: string
): Promise<User> {
  const result = await pool.query(
    'INSERT INTO users (email, name, password_hash, google_id, credits_balance) VALUES ($1, $2, $3, $4, 10) RETURNING *',
    [email, name || null, passwordHash || null, googleId || null]
  );
  return result.rows[0] as User;
}

export async function updateUserCredits(
  userId: number,
  creditsChange: number,
  transactionType: 'purchase' | 'training' | 'generation' | 'video',
  description?: string,
  amountUsd?: number,
  stripePaymentId?: string
): Promise<User> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get current user
    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0] as User;
    if (!user) throw new Error('User not found');

    const newBalance = user.credits_balance + creditsChange;
    if (newBalance < 0) throw new Error('Insufficient credits');

    // Update user credits
    const updateResult = await client.query(
      'UPDATE users SET credits_balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [newBalance, userId]
    );

    // Record transaction
    await client.query(
      'INSERT INTO transactions (user_id, type, credits_change, credits_balance_after, amount_usd, stripe_payment_id, description) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [userId, transactionType, creditsChange, newBalance, amountUsd || null, stripePaymentId || null, description || null]
    );

    await client.query('COMMIT');
    return updateResult.rows[0] as User;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// Model operations

// Generate unique model name by appending numbers if duplicate exists
async function getUniqueModelName(userId: number, baseName: string): Promise<string> {
  const result = await pool.query(
    'SELECT name FROM models WHERE user_id = $1 AND (name = $2 OR name LIKE $3)',
    [userId, baseName, `${baseName} %`]
  );

  if (result.rows.length === 0) return baseName;

  // Check if exact base name exists
  const names = result.rows.map(r => r.name as string);
  const hasExactMatch = names.includes(baseName);

  if (!hasExactMatch) return baseName;

  // Find highest number suffix
  let maxNum = 1;
  for (const name of names) {
    if (name === baseName) continue;
    const match = name.match(/^.+ (\d+)$/);
    if (match) {
      const num = parseInt(match[1]);
      if (num >= maxNum) maxNum = num + 1;
    }
  }

  // If only base name exists, start with 2
  if (maxNum === 1) maxNum = 2;

  return `${baseName} ${maxNum}`;
}

export async function createModel(
  userId: number,
  name: string,
  loraUrl: string,
  triggerWord: string,
  trainingImagesCount: number,
  petType?: 'dog' | 'cat' | 'unknown'
): Promise<Model> {
  // Get unique name in case of duplicates
  const uniqueName = await getUniqueModelName(userId, name);

  const result = await pool.query(
    'INSERT INTO models (user_id, name, lora_url, trigger_word, training_images_count, pet_type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [userId, uniqueName, loraUrl, triggerWord, trainingImagesCount, petType || 'dog']
  );
  return result.rows[0] as Model;
}

export async function getUserModels(userId: number): Promise<Model[]> {
  const result = await pool.query(
    'SELECT * FROM models WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows as Model[];
}

export async function getModelById(modelId: number, userId?: number): Promise<Model | null> {
  const query = userId
    ? 'SELECT * FROM models WHERE id = $1 AND user_id = $2'
    : 'SELECT * FROM models WHERE id = $1';
  const params = userId ? [modelId, userId] : [modelId];

  const result = await pool.query(query, params);
  return result.rows[0] as Model || null;
}

export async function updateModelNotes(modelId: number, userId: number, notes: string): Promise<Model | null> {
  const result = await pool.query(
    'UPDATE models SET notes = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
    [notes, modelId, userId]
  );
  return result.rows[0] as Model || null;
}

export async function updateModelPreviewImage(modelId: number, previewImageUrl: string): Promise<Model | null> {
  const result = await pool.query(
    'UPDATE models SET preview_image_url = $1 WHERE id = $2 RETURNING *',
    [previewImageUrl, modelId]
  );
  return result.rows[0] as Model || null;
}

export async function updateModelPreview(modelId: number, userId: number, previewImageUrl: string): Promise<Model | null> {
  const result = await pool.query(
    'UPDATE models SET preview_image_url = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
    [previewImageUrl, modelId, userId]
  );
  return result.rows[0] as Model || null;
}

export async function updateModelProductDescription(modelId: number, productDescription: string): Promise<Model | null> {
  const result = await pool.query(
    'UPDATE models SET product_description = $1 WHERE id = $2 RETURNING *',
    [productDescription, modelId]
  );
  return result.rows[0] as Model || null;
}

export async function deleteModel(modelId: number, userId: number): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete associated generations first (if any reference the model)
    await client.query(
      'DELETE FROM generations WHERE model_id = $1 AND user_id = $2',
      [modelId, userId]
    );

    // Delete associated training images
    await client.query(
      'DELETE FROM training_images WHERE model_id = $1',
      [modelId]
    );

    // Delete the model
    const result = await client.query(
      'DELETE FROM models WHERE id = $1 AND user_id = $2',
      [modelId, userId]
    );

    await client.query('COMMIT');
    return result.rowCount ? result.rowCount > 0 : false;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// Generation operations
export async function createGeneration(
  userId: number,
  modelId: number | null,
  presetPromptId: string | null,
  customPrompt: string | null,
  imageUrls: string[],
  creditsUsed: number,
  rowPrompts?: string[],
  imageQualityScores?: number[],
  aspectRatio?: string
): Promise<Generation> {
  const result = await pool.query(
    'INSERT INTO generations (user_id, model_id, preset_prompt_id, custom_prompt, image_urls, credits_used, row_prompts, image_quality_scores, aspect_ratio) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
    [userId, modelId, presetPromptId || null, customPrompt || null, imageUrls, creditsUsed, rowPrompts || null, imageQualityScores || null, aspectRatio || 'instagram-feed']
  );
  return result.rows[0] as Generation;
}

export async function getUserGenerations(userId: number, limit: number = 50): Promise<Generation[]> {
  const result = await pool.query(
    'SELECT * FROM generations WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
    [userId, limit]
  );
  return result.rows as Generation[];
}

export async function getModelGenerations(modelId: number, userId: number): Promise<Generation[]> {
  const result = await pool.query(
    'SELECT * FROM generations WHERE model_id = $1 AND user_id = $2 ORDER BY created_at DESC',
    [modelId, userId]
  );
  return result.rows as Generation[];
}

export async function getModelGenerationCount(modelId: number, userId: number): Promise<number> {
  const result = await pool.query(
    'SELECT COUNT(*) FROM generations WHERE model_id = $1 AND user_id = $2',
    [modelId, userId]
  );
  return parseInt(result.rows[0].count);
}

export async function getGenerationById(generationId: number, userId: number): Promise<Generation | null> {
  const result = await pool.query(
    'SELECT * FROM generations WHERE id = $1 AND user_id = $2',
    [generationId, userId]
  );
  return result.rows[0] as Generation || null;
}

export async function updateGenerationImages(
  generationId: number,
  userId: number,
  imageUrls: string[],
  rerollUsed: boolean = true
): Promise<Generation | null> {
  const result = await pool.query(
    'UPDATE generations SET image_urls = $1, reroll_used = $2 WHERE id = $3 AND user_id = $4 RETURNING *',
    [imageUrls, rerollUsed, generationId, userId]
  );
  return result.rows[0] as Generation || null;
}

export async function updateGenerationUpscale(
  generationId: number,
  userId: number,
  imageUrls: string[],
  upscaleUsed: boolean = true
): Promise<Generation | null> {
  const result = await pool.query(
    'UPDATE generations SET image_urls = $1, upscale_used = $2 WHERE id = $3 AND user_id = $4 RETURNING *',
    [imageUrls, upscaleUsed, generationId, userId]
  );
  return result.rows[0] as Generation || null;
}

// Transaction operations
export async function getUserTransactions(userId: number, limit: number = 50): Promise<Transaction[]> {
  const result = await pool.query(
    'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
    [userId, limit]
  );
  return result.rows as Transaction[];
}

// Training images operations
export async function saveTrainingImages(
  modelId: number,
  images: { data: Buffer; fileName: string; fileSize: number }[]
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const image of images) {
      await client.query(
        'INSERT INTO training_images (model_id, image_data, file_name, file_size) VALUES ($1, $2, $3, $4)',
        [modelId, image.data, image.fileName, image.fileSize]
      );
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function getTrainingImages(modelId: number): Promise<{ id: number; image_data: Buffer; file_name: string }[]> {
  const result = await pool.query(
    'SELECT id, image_data, file_name FROM training_images WHERE model_id = $1 ORDER BY id',
    [modelId]
  );
  return result.rows as { id: number; image_data: Buffer; file_name: string }[];
}

// Email verification operations
export async function setEmailVerificationToken(
  userId: number,
  token: string,
  expiresAt: Date
): Promise<void> {
  await pool.query(
    'UPDATE users SET email_verification_token = $1, email_verification_expires = $2 WHERE id = $3',
    [token, expiresAt, userId]
  );
}

export async function getUserByVerificationToken(token: string): Promise<User | null> {
  const result = await pool.query(
    'SELECT * FROM users WHERE email_verification_token = $1 AND email_verification_expires > NOW()',
    [token]
  );
  return result.rows[0] as User || null;
}

export async function verifyUserEmail(userId: number): Promise<void> {
  await pool.query(
    'UPDATE users SET email_verified = TRUE, email_verification_token = NULL, email_verification_expires = NULL WHERE id = $1',
    [userId]
  );
}

// Video generation operations
export async function createVideoGeneration(
  userId: number,
  modelId: number | null,
  sourceImageUrl: string,
  motionPrompt: string,
  creditsUsed: number
): Promise<VideoGeneration> {
  const result = await pool.query(
    'INSERT INTO video_generations (user_id, model_id, source_image_url, motion_prompt, status, credits_used) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [userId, modelId, sourceImageUrl, motionPrompt, 'pending', creditsUsed]
  );
  return result.rows[0] as VideoGeneration;
}

export async function updateVideoGenerationFalRequestId(
  videoId: number,
  userId: number,
  falRequestId: string
): Promise<VideoGeneration | null> {
  const result = await pool.query(
    'UPDATE video_generations SET fal_request_id = $1, status = $2 WHERE id = $3 AND user_id = $4 RETURNING *',
    [falRequestId, 'processing', videoId, userId]
  );
  return result.rows[0] as VideoGeneration || null;
}

export async function updateVideoGenerationStatus(
  videoId: number,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  videoUrl?: string,
  errorMessage?: string
): Promise<VideoGeneration | null> {
  const completedAt = status === 'completed' || status === 'failed' ? 'CURRENT_TIMESTAMP' : null;
  const result = await pool.query(
    `UPDATE video_generations SET status = $1, video_url = $2, error_message = $3, completed_at = ${completedAt ? 'CURRENT_TIMESTAMP' : 'NULL'} WHERE id = $4 RETURNING *`,
    [status, videoUrl || null, errorMessage || null, videoId]
  );
  return result.rows[0] as VideoGeneration || null;
}

export async function getVideoGenerationById(videoId: number, userId: number): Promise<VideoGeneration | null> {
  const result = await pool.query(
    'SELECT * FROM video_generations WHERE id = $1 AND user_id = $2',
    [videoId, userId]
  );
  return result.rows[0] as VideoGeneration || null;
}

export async function getVideoGenerationByFalRequestId(falRequestId: string): Promise<VideoGeneration | null> {
  const result = await pool.query(
    'SELECT * FROM video_generations WHERE fal_request_id = $1',
    [falRequestId]
  );
  return result.rows[0] as VideoGeneration || null;
}

export async function getUserVideoGenerations(userId: number, limit: number = 50): Promise<VideoGeneration[]> {
  const result = await pool.query(
    'SELECT * FROM video_generations WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
    [userId, limit]
  );
  return result.rows as VideoGeneration[];
}

export async function getModelVideoGenerations(modelId: number, userId: number): Promise<VideoGeneration[]> {
  const result = await pool.query(
    'SELECT * FROM video_generations WHERE model_id = $1 AND user_id = $2 ORDER BY created_at DESC',
    [modelId, userId]
  );
  return result.rows as VideoGeneration[];
}

export async function getPendingVideoGenerations(): Promise<VideoGeneration[]> {
  const result = await pool.query(
    "SELECT * FROM video_generations WHERE status IN ('pending', 'processing') ORDER BY created_at ASC"
  );
  return result.rows as VideoGeneration[];
}

// Pending training operations
export async function createPendingTraining(
  userId: number,
  falRequestId: string,
  triggerWord: string,
  modelName: string,
  imagesCount: number,
  petType?: 'dog' | 'cat' | 'unknown'
): Promise<PendingTraining> {
  const result = await pool.query(
    'INSERT INTO pending_trainings (user_id, fal_request_id, trigger_word, model_name, images_count, status, pet_type) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
    [userId, falRequestId, triggerWord, modelName, imagesCount, 'training', petType || 'dog']
  );
  return result.rows[0] as PendingTraining;
}

export async function getUserPendingTrainings(userId: number): Promise<PendingTraining[]> {
  const result = await pool.query(
    "SELECT * FROM pending_trainings WHERE user_id = $1 AND status = 'training' ORDER BY created_at DESC",
    [userId]
  );
  return result.rows as PendingTraining[];
}

export async function getPendingTrainingByRequestId(falRequestId: string): Promise<PendingTraining | null> {
  const result = await pool.query(
    'SELECT * FROM pending_trainings WHERE fal_request_id = $1',
    [falRequestId]
  );
  return result.rows[0] as PendingTraining || null;
}

export async function updatePendingTrainingRequestId(
  pendingId: number,
  falRequestId: string
): Promise<PendingTraining | null> {
  const result = await pool.query(
    'UPDATE pending_trainings SET fal_request_id = $1 WHERE id = $2 RETURNING *',
    [falRequestId, pendingId]
  );
  return result.rows[0] as PendingTraining || null;
}

export async function updatePendingTrainingStatus(
  falRequestId: string,
  status: 'training' | 'completed' | 'failed',
  errorMessage?: string
): Promise<PendingTraining | null> {
  const completedAt = status === 'completed' || status === 'failed' ? 'CURRENT_TIMESTAMP' : null;
  const result = await pool.query(
    `UPDATE pending_trainings SET status = $1, error_message = $2, completed_at = ${completedAt ? 'CURRENT_TIMESTAMP' : 'NULL'} WHERE fal_request_id = $3 RETURNING *`,
    [status, errorMessage || null, falRequestId]
  );
  return result.rows[0] as PendingTraining || null;
}

export async function updatePendingTrainingPetType(
  pendingId: number,
  petType: 'dog' | 'cat' | 'unknown'
): Promise<PendingTraining | null> {
  const result = await pool.query(
    'UPDATE pending_trainings SET pet_type = $1 WHERE id = $2 RETURNING *',
    [petType, pendingId]
  );
  return result.rows[0] as PendingTraining || null;
}

export async function deletePendingTraining(falRequestId: string): Promise<void> {
  await pool.query(
    'DELETE FROM pending_trainings WHERE fal_request_id = $1',
    [falRequestId]
  );
}

// Product features operations
export async function updateModelProductFeatures(
  modelId: number,
  userId: number,
  features: ProductFeatures
): Promise<Model | null> {
  const result = await pool.query(
    'UPDATE models SET product_features = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
    [JSON.stringify(features), modelId, userId]
  );
  return result.rows[0] as Model || null;
}

export async function getModelProductFeatures(modelId: number, userId: number): Promise<ProductFeatures | null> {
  const result = await pool.query(
    'SELECT product_features FROM models WHERE id = $1 AND user_id = $2',
    [modelId, userId]
  );
  if (!result.rows[0]) return null;
  return result.rows[0].product_features as ProductFeatures || null;
}

export async function mergeModelProductFeatures(
  modelId: number,
  userId: number,
  newFeatures: Partial<ProductFeatures>
): Promise<Model | null> {
  // Get existing features
  const existing = await getModelProductFeatures(modelId, userId);

  // Merge with new features (new features take priority)
  const merged: ProductFeatures = {
    ...existing,
    ...newFeatures,
  };

  return updateModelProductFeatures(modelId, userId, merged);
}

// Admin config operations
export async function getAdminConfig<T = unknown>(key: string): Promise<T | null> {
  const result = await pool.query(
    'SELECT value FROM admin_config WHERE key = $1',
    [key]
  );
  return result.rows[0]?.value as T || null;
}

export async function setAdminConfig(key: string, value: unknown): Promise<void> {
  await pool.query(
    `INSERT INTO admin_config (key, value, updated_at)
     VALUES ($1, $2, CURRENT_TIMESTAMP)
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
    [key, JSON.stringify(value)]
  );
}
