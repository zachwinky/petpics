import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  },
});

// Admin user emails (configure these in environment variable)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export interface AdminStats {
  totalUsers: number;
  totalCreditsIssued: number;
  totalCreditsSpent: number;
  totalRevenue: number;
  totalModels: number;
  totalGenerations: number;
  recentSignups: number; // Last 7 days
  recentRevenue: number; // Last 30 days
}

export interface UserSummary {
  id: number;
  email: string;
  name: string | null;
  credits_balance: number;
  total_spent: number;
  total_purchased: number;
  models_count: number;
  generations_count: number;
  created_at: Date;
  last_activity: Date | null;
}

export async function getAdminStats(): Promise<AdminStats> {
  const stats = await pool.query(`
    SELECT
      COUNT(DISTINCT u.id) as total_users,
      COALESCE(SUM(CASE WHEN t.type = 'purchase' THEN t.credits_change ELSE 0 END), 0) as total_credits_issued,
      COALESCE(SUM(CASE WHEN t.type IN ('training', 'generation') THEN ABS(t.credits_change) ELSE 0 END), 0) as total_credits_spent,
      COALESCE(SUM(t.amount_usd), 0) as total_revenue,
      COUNT(DISTINCT m.id) as total_models,
      COUNT(DISTINCT g.id) as total_generations,
      COUNT(DISTINCT CASE WHEN u.created_at > NOW() - INTERVAL '7 days' THEN u.id END) as recent_signups,
      COALESCE(SUM(CASE WHEN t.type = 'purchase' AND t.created_at > NOW() - INTERVAL '30 days' THEN t.amount_usd ELSE 0 END), 0) as recent_revenue
    FROM users u
    LEFT JOIN transactions t ON u.id = t.user_id
    LEFT JOIN models m ON u.id = m.user_id
    LEFT JOIN generations g ON u.id = g.user_id
  `);

  const row = stats.rows[0];

  // Transform snake_case SQL results to camelCase for TypeScript interface
  return {
    totalUsers: parseInt(row.total_users) || 0,
    totalCreditsIssued: parseInt(row.total_credits_issued) || 0,
    totalCreditsSpent: parseInt(row.total_credits_spent) || 0,
    totalRevenue: parseFloat(row.total_revenue) || 0,
    totalModels: parseInt(row.total_models) || 0,
    totalGenerations: parseInt(row.total_generations) || 0,
    recentSignups: parseInt(row.recent_signups) || 0,
    recentRevenue: parseFloat(row.recent_revenue) || 0,
  };
}

export async function getAllUsers(
  limit: number = 50,
  offset: number = 0,
  sortBy: 'created_at' | 'credits_balance' | 'total_spent' = 'created_at',
  order: 'ASC' | 'DESC' = 'DESC'
): Promise<UserSummary[]> {
  const validSortColumns = ['created_at', 'credits_balance', 'total_spent'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

  const result = await pool.query(`
    SELECT
      u.id,
      u.email,
      u.name,
      u.credits_balance,
      COALESCE(SUM(CASE WHEN t.type IN ('training', 'generation') THEN ABS(t.credits_change) ELSE 0 END), 0) as total_spent,
      COALESCE(SUM(CASE WHEN t.type = 'purchase' THEN t.credits_change ELSE 0 END), 0) as total_purchased,
      COUNT(DISTINCT m.id) as models_count,
      COUNT(DISTINCT g.id) as generations_count,
      u.created_at,
      MAX(GREATEST(
        COALESCE(m.created_at, '1970-01-01'::timestamp),
        COALESCE(g.created_at, '1970-01-01'::timestamp),
        COALESCE(t.created_at, '1970-01-01'::timestamp)
      )) as last_activity
    FROM users u
    LEFT JOIN transactions t ON u.id = t.user_id
    LEFT JOIN models m ON u.id = m.user_id
    LEFT JOIN generations g ON u.id = g.user_id
    GROUP BY u.id, u.email, u.name, u.credits_balance, u.created_at
    ORDER BY ${sortColumn} ${sortOrder}
    LIMIT $1 OFFSET $2
  `, [limit, offset]);

  // Transform rows to match interface (snake_case from SQL already matches interface for this query)
  return result.rows.map(row => ({
    id: row.id,
    email: row.email,
    name: row.name,
    credits_balance: parseInt(row.credits_balance) || 0,
    total_spent: parseInt(row.total_spent) || 0,
    total_purchased: parseInt(row.total_purchased) || 0,
    models_count: parseInt(row.models_count) || 0,
    generations_count: parseInt(row.generations_count) || 0,
    created_at: row.created_at,
    last_activity: row.last_activity !== '1970-01-01T00:00:00.000Z' ? row.last_activity : null,
  }));
}

export interface UserDetail extends UserSummary {
  transactions: Array<{
    id: number;
    type: string;
    credits_change: number;
    amount_usd: number | null;
    description: string | null;
    created_at: Date;
  }>;
  models: Array<{
    id: number;
    name: string;
    trigger_word: string;
    training_images_count: number;
    created_at: Date;
  }>;
  recentGenerations: Array<{
    id: number;
    model_id: number | null;
    credits_used: number;
    image_count: number;
    created_at: Date;
  }>;
}

export async function getUserDetail(userId: number): Promise<UserDetail | null> {
  // Get user summary
  const userResult = await pool.query(`
    SELECT
      u.id,
      u.email,
      u.name,
      u.credits_balance,
      COALESCE(SUM(CASE WHEN t.type IN ('training', 'generation') THEN ABS(t.credits_change) ELSE 0 END), 0) as total_spent,
      COALESCE(SUM(CASE WHEN t.type = 'purchase' THEN t.credits_change ELSE 0 END), 0) as total_purchased,
      COUNT(DISTINCT m.id) as models_count,
      COUNT(DISTINCT g.id) as generations_count,
      u.created_at,
      MAX(GREATEST(
        COALESCE(m.created_at, '1970-01-01'::timestamp),
        COALESCE(g.created_at, '1970-01-01'::timestamp),
        COALESCE(t.created_at, '1970-01-01'::timestamp)
      )) as last_activity
    FROM users u
    LEFT JOIN transactions t ON u.id = t.user_id
    LEFT JOIN models m ON u.id = m.user_id
    LEFT JOIN generations g ON u.id = g.user_id
    WHERE u.id = $1
    GROUP BY u.id, u.email, u.name, u.credits_balance, u.created_at
  `, [userId]);

  if (userResult.rows.length === 0) return null;

  // Get transactions
  const transactionsResult = await pool.query(`
    SELECT id, type, credits_change, amount_usd, description, created_at
    FROM transactions
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 50
  `, [userId]);

  // Get models
  const modelsResult = await pool.query(`
    SELECT id, name, trigger_word, training_images_count, created_at
    FROM models
    WHERE user_id = $1
    ORDER BY created_at DESC
  `, [userId]);

  // Get recent generations
  const generationsResult = await pool.query(`
    SELECT id, model_id, credits_used, array_length(image_urls, 1) as image_count, created_at
    FROM generations
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 20
  `, [userId]);

  return {
    ...userResult.rows[0],
    transactions: transactionsResult.rows,
    models: modelsResult.rows,
    recentGenerations: generationsResult.rows,
  } as UserDetail;
}

export async function addCreditsToUser(
  userId: number,
  credits: number,
  description: string
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update user balance
    const userResult = await client.query(
      'UPDATE users SET credits_balance = credits_balance + $1 WHERE id = $2 RETURNING credits_balance',
      [credits, userId]
    );

    // Record transaction
    await client.query(
      'INSERT INTO transactions (user_id, type, credits_change, credits_balance_after, description) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'purchase', credits, userResult.rows[0].credits_balance, description]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Search users by email or name
export async function searchUsers(
  query: string,
  limit: number = 50
): Promise<UserSummary[]> {
  const searchPattern = `%${query.toLowerCase()}%`;

  const result = await pool.query(`
    SELECT
      u.id,
      u.email,
      u.name,
      u.credits_balance,
      COALESCE(SUM(CASE WHEN t.type IN ('training', 'generation') THEN ABS(t.credits_change) ELSE 0 END), 0) as total_spent,
      COALESCE(SUM(CASE WHEN t.type = 'purchase' THEN t.credits_change ELSE 0 END), 0) as total_purchased,
      COUNT(DISTINCT m.id) as models_count,
      COUNT(DISTINCT g.id) as generations_count,
      u.created_at,
      MAX(GREATEST(
        COALESCE(m.created_at, '1970-01-01'::timestamp),
        COALESCE(g.created_at, '1970-01-01'::timestamp),
        COALESCE(t.created_at, '1970-01-01'::timestamp)
      )) as last_activity
    FROM users u
    LEFT JOIN transactions t ON u.id = t.user_id
    LEFT JOIN models m ON u.id = m.user_id
    LEFT JOIN generations g ON u.id = g.user_id
    WHERE LOWER(u.email) LIKE $1 OR LOWER(COALESCE(u.name, '')) LIKE $1
    GROUP BY u.id, u.email, u.name, u.credits_balance, u.created_at
    ORDER BY u.created_at DESC
    LIMIT $2
  `, [searchPattern, limit]);

  return result.rows.map(row => ({
    id: row.id,
    email: row.email,
    name: row.name,
    credits_balance: parseInt(row.credits_balance) || 0,
    total_spent: parseInt(row.total_spent) || 0,
    total_purchased: parseInt(row.total_purchased) || 0,
    models_count: parseInt(row.models_count) || 0,
    generations_count: parseInt(row.generations_count) || 0,
    created_at: row.created_at,
    last_activity: row.last_activity !== '1970-01-01T00:00:00.000Z' ? row.last_activity : null,
  }));
}

// Get pending trainings (non-completed)
export interface PendingTraining {
  id: number;
  user_id: number;
  user_email: string;
  trigger_word: string;
  model_name: string | null;
  status: 'training' | 'completed' | 'failed';
  error_message: string | null;
  images_count: number;
  created_at: Date;
  completed_at: Date | null;
}

export async function getPendingTrainings(): Promise<PendingTraining[]> {
  const result = await pool.query(`
    SELECT
      pt.id,
      pt.user_id,
      u.email as user_email,
      pt.trigger_word,
      pt.model_name,
      pt.status,
      pt.error_message,
      pt.images_count,
      pt.created_at,
      pt.completed_at
    FROM pending_trainings pt
    JOIN users u ON pt.user_id = u.id
    WHERE pt.status != 'completed'
    ORDER BY pt.created_at DESC
    LIMIT 50
  `);

  return result.rows;
}

// Get failed trainings (last 7 days)
export async function getFailedTrainings(): Promise<PendingTraining[]> {
  const result = await pool.query(`
    SELECT
      pt.id,
      pt.user_id,
      u.email as user_email,
      pt.trigger_word,
      pt.model_name,
      pt.status,
      pt.error_message,
      pt.images_count,
      pt.created_at,
      pt.completed_at
    FROM pending_trainings pt
    JOIN users u ON pt.user_id = u.id
    WHERE pt.status = 'failed' AND pt.created_at > NOW() - INTERVAL '7 days'
    ORDER BY pt.created_at DESC
    LIMIT 50
  `);

  return result.rows;
}

// Get video generations
export interface VideoGeneration {
  id: number;
  user_id: number;
  user_email: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  credits_used: number;
  created_at: Date;
  completed_at: Date | null;
}

export async function getVideoGenerations(
  status?: 'pending' | 'processing' | 'completed' | 'failed'
): Promise<VideoGeneration[]> {
  let query = `
    SELECT
      vg.id,
      vg.user_id,
      u.email as user_email,
      vg.status,
      vg.error_message,
      vg.credits_used,
      vg.created_at,
      vg.completed_at
    FROM video_generations vg
    JOIN users u ON vg.user_id = u.id
  `;

  const params: (string | number)[] = [];

  if (status) {
    query += ` WHERE vg.status = $1`;
    params.push(status);
  }

  query += ` ORDER BY vg.created_at DESC LIMIT 50`;

  const result = await pool.query(query, params);
  return result.rows;
}

// Get failure counts for dashboard summary
export interface FailureCounts {
  failedTrainings: number;
  failedVideos: number;
  pendingTrainings: number;
  pendingVideos: number;
}

export async function getFailureCounts(): Promise<FailureCounts> {
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM pending_trainings WHERE status = 'failed' AND created_at > NOW() - INTERVAL '7 days') as failed_trainings,
      (SELECT COUNT(*) FROM video_generations WHERE status = 'failed' AND created_at > NOW() - INTERVAL '7 days') as failed_videos,
      (SELECT COUNT(*) FROM pending_trainings WHERE status = 'training') as pending_trainings,
      (SELECT COUNT(*) FROM video_generations WHERE status IN ('pending', 'processing')) as pending_videos
  `);

  const row = result.rows[0];
  return {
    failedTrainings: parseInt(row.failed_trainings) || 0,
    failedVideos: parseInt(row.failed_videos) || 0,
    pendingTrainings: parseInt(row.pending_trainings) || 0,
    pendingVideos: parseInt(row.pending_videos) || 0,
  };
}

// Update video generation status
export async function updateVideoStatus(
  videoId: number,
  newStatus: 'pending' | 'processing' | 'completed' | 'failed',
  errorMessage?: string
): Promise<{ success: boolean; message: string }> {
  const client = await pool.connect();
  try {
    // Get current video info
    const video = await client.query(
      'SELECT id, status, user_id, credits_used FROM video_generations WHERE id = $1',
      [videoId]
    );

    if (video.rows.length === 0) {
      return { success: false, message: 'Video not found' };
    }

    const currentStatus = video.rows[0].status;

    // Update the video status
    if (newStatus === 'failed' && errorMessage) {
      await client.query(
        'UPDATE video_generations SET status = $1, error_message = $2 WHERE id = $3',
        [newStatus, errorMessage, videoId]
      );
    } else if (newStatus === 'completed') {
      await client.query(
        'UPDATE video_generations SET status = $1, completed_at = NOW() WHERE id = $2',
        [newStatus, videoId]
      );
    } else {
      await client.query(
        'UPDATE video_generations SET status = $1 WHERE id = $2',
        [newStatus, videoId]
      );
    }

    return {
      success: true,
      message: `Video status updated from "${currentStatus}" to "${newStatus}"`,
    };
  } finally {
    client.release();
  }
}

// Update pending training status
export async function updateTrainingStatus(
  trainingId: number,
  newStatus: 'training' | 'completed' | 'failed',
  errorMessage?: string
): Promise<{ success: boolean; message: string }> {
  const client = await pool.connect();
  try {
    const training = await client.query(
      'SELECT id, status, trigger_word FROM pending_trainings WHERE id = $1',
      [trainingId]
    );

    if (training.rows.length === 0) {
      return { success: false, message: 'Training not found' };
    }

    const currentStatus = training.rows[0].status;

    if (newStatus === 'failed' && errorMessage) {
      await client.query(
        'UPDATE pending_trainings SET status = $1, error_message = $2 WHERE id = $3',
        [newStatus, errorMessage, trainingId]
      );
    } else if (newStatus === 'completed') {
      await client.query(
        'UPDATE pending_trainings SET status = $1, completed_at = NOW() WHERE id = $2',
        [newStatus, trainingId]
      );
    } else {
      await client.query(
        'UPDATE pending_trainings SET status = $1 WHERE id = $2',
        [newStatus, trainingId]
      );
    }

    return {
      success: true,
      message: `Training status updated from "${currentStatus}" to "${newStatus}"`,
    };
  } finally {
    client.release();
  }
}

// Refund a failed training
export async function refundTraining(trainingId: number): Promise<{ success: boolean; message: string }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get the training details
    const training = await client.query(
      'SELECT user_id, trigger_word, status FROM pending_trainings WHERE id = $1',
      [trainingId]
    );

    if (training.rows.length === 0) {
      return { success: false, message: 'Training not found' };
    }

    if (training.rows[0].status !== 'failed') {
      return { success: false, message: 'Can only refund failed trainings' };
    }

    const userId = training.rows[0].user_id;
    const triggerWord = training.rows[0].trigger_word;
    const refundAmount = 5; // Training costs 5 credits

    // Add credits back to user
    const userResult = await client.query(
      'UPDATE users SET credits_balance = credits_balance + $1 WHERE id = $2 RETURNING credits_balance',
      [refundAmount, userId]
    );

    // Record refund transaction
    await client.query(
      'INSERT INTO transactions (user_id, type, credits_change, credits_balance_after, description) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'purchase', refundAmount, userResult.rows[0].credits_balance, `Refund for failed training: ${triggerWord}`]
    );

    // Mark training as refunded by updating error message
    await client.query(
      "UPDATE pending_trainings SET error_message = COALESCE(error_message, '') || ' [REFUNDED]' WHERE id = $1",
      [trainingId]
    );

    await client.query('COMMIT');
    return { success: true, message: `Refunded ${refundAmount} credits for failed training "${triggerWord}"` };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
