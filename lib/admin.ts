import { pool, getAdminConfig, getActiveCartSnapshots, getEventFunnelStats, getUserEvents } from '@/lib/db';
export { getActiveCartSnapshots, getEventFunnelStats, getUserEvents };

// Admin user emails (configure these in environment variable)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export interface AdminStats {
  totalUsers: number;
  totalPrintOrders: number;
  totalPrintRevenue: number; // cents
  totalModels: number;
  totalGenerations: number;
  recentSignups: number; // Last 7 days
  recentRevenue: number; // Last 30 days, cents
  activeCartsCount: number;
  activeCartsValue: number; // cents
}

export interface UserSummary {
  id: number;
  email: string;
  name: string | null;
  banned_at: string | null;
  print_order_count: number;
  print_order_total_cents: number;
  models_count: number;
  generations_count: number;
  pending_trainings_count: number;
  created_at: Date;
  last_activity: Date | null;
}

export async function getAdminStats(): Promise<AdminStats> {
  const stats = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users) as total_users,
      (SELECT COUNT(*) FROM print_orders WHERE status NOT IN ('failed', 'refunded')) as total_print_orders,
      (SELECT COALESCE(SUM(total_cents), 0) FROM print_orders WHERE status NOT IN ('failed', 'refunded')) as total_print_revenue,
      (SELECT COUNT(*) FROM models) as total_models,
      (SELECT COUNT(*) FROM generations) as total_generations,
      (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days') as recent_signups,
      (SELECT COALESCE(SUM(total_cents), 0) FROM print_orders WHERE status NOT IN ('failed', 'refunded') AND created_at > NOW() - INTERVAL '30 days') as recent_revenue,
      (SELECT COUNT(*) FROM cart_snapshots WHERE item_count > 0) as active_carts_count,
      (SELECT COALESCE(SUM(total_cents), 0) FROM cart_snapshots WHERE item_count > 0) as active_carts_value
  `);

  const row = stats.rows[0];

  return {
    totalUsers: parseInt(row.total_users) || 0,
    totalPrintOrders: parseInt(row.total_print_orders) || 0,
    totalPrintRevenue: parseInt(row.total_print_revenue) || 0,
    totalModels: parseInt(row.total_models) || 0,
    totalGenerations: parseInt(row.total_generations) || 0,
    recentSignups: parseInt(row.recent_signups) || 0,
    recentRevenue: parseInt(row.recent_revenue) || 0,
    activeCartsCount: parseInt(row.active_carts_count) || 0,
    activeCartsValue: parseInt(row.active_carts_value) || 0,
  };
}

export async function getAllUsers(
  limit: number = 50,
  offset: number = 0,
  sortBy: 'created_at' | 'print_order_total_cents' = 'created_at',
  order: 'ASC' | 'DESC' = 'DESC'
): Promise<UserSummary[]> {
  const validSortColumns = ['created_at', 'print_order_total_cents'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

  const result = await pool.query(`
    SELECT
      u.id,
      u.email,
      u.name,
      u.banned_at,
      COALESCE((SELECT COUNT(*) FROM print_orders WHERE user_id = u.id AND status NOT IN ('failed', 'refunded')), 0) as print_order_count,
      COALESCE((SELECT SUM(total_cents) FROM print_orders WHERE user_id = u.id AND status NOT IN ('failed', 'refunded')), 0) as print_order_total_cents,
      (SELECT COUNT(*) FROM models WHERE user_id = u.id) as models_count,
      (SELECT COUNT(*) FROM generations WHERE user_id = u.id) as generations_count,
      (SELECT COUNT(*) FROM pending_trainings WHERE user_id = u.id) as pending_trainings_count,
      u.created_at,
      GREATEST(
        u.created_at,
        COALESCE((SELECT MAX(created_at) FROM models WHERE user_id = u.id), '1970-01-01'::timestamp),
        COALESCE((SELECT MAX(created_at) FROM generations WHERE user_id = u.id), '1970-01-01'::timestamp),
        COALESCE((SELECT MAX(created_at) FROM print_orders WHERE user_id = u.id), '1970-01-01'::timestamp)
      ) as last_activity
    FROM users u
    ORDER BY ${sortColumn} ${sortOrder}
    LIMIT $1 OFFSET $2
  `, [limit, offset]);

  return result.rows.map(row => ({
    id: row.id,
    email: row.email,
    name: row.name,
    banned_at: row.banned_at || null,
    print_order_count: parseInt(row.print_order_count) || 0,
    print_order_total_cents: parseInt(row.print_order_total_cents) || 0,
    models_count: parseInt(row.models_count) || 0,
    generations_count: parseInt(row.generations_count) || 0,
    pending_trainings_count: parseInt(row.pending_trainings_count) || 0,
    created_at: row.created_at,
    last_activity: row.last_activity !== '1970-01-01T00:00:00.000Z' ? row.last_activity : null,
  }));
}

export interface UserDetail extends UserSummary {
  printOrders: Array<{
    id: number;
    status: string;
    total_cents: number;
    item_count: number;
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
    image_count: number;
    created_at: Date;
  }>;
}

export async function getUserDetail(userId: number): Promise<UserDetail | null> {
  const userResult = await pool.query(`
    SELECT
      u.id,
      u.email,
      u.name,
      u.banned_at,
      COALESCE((SELECT COUNT(*) FROM print_orders WHERE user_id = u.id AND status NOT IN ('failed', 'refunded')), 0) as print_order_count,
      COALESCE((SELECT SUM(total_cents) FROM print_orders WHERE user_id = u.id AND status NOT IN ('failed', 'refunded')), 0) as print_order_total_cents,
      (SELECT COUNT(*) FROM models WHERE user_id = u.id) as models_count,
      (SELECT COUNT(*) FROM generations WHERE user_id = u.id) as generations_count,
      (SELECT COUNT(*) FROM pending_trainings WHERE user_id = u.id) as pending_trainings_count,
      u.created_at,
      GREATEST(
        u.created_at,
        COALESCE((SELECT MAX(created_at) FROM models WHERE user_id = u.id), '1970-01-01'::timestamp),
        COALESCE((SELECT MAX(created_at) FROM generations WHERE user_id = u.id), '1970-01-01'::timestamp),
        COALESCE((SELECT MAX(created_at) FROM print_orders WHERE user_id = u.id), '1970-01-01'::timestamp)
      ) as last_activity
    FROM users u
    WHERE u.id = $1
  `, [userId]);

  if (userResult.rows.length === 0) return null;

  // Get print orders
  const ordersResult = await pool.query(`
    SELECT po.id, po.status, po.total_cents,
      (SELECT COUNT(*) FROM print_order_items WHERE order_id = po.id) as item_count,
      po.created_at
    FROM print_orders po
    WHERE po.user_id = $1
    ORDER BY po.created_at DESC
    LIMIT 20
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
    SELECT id, model_id, array_length(image_urls, 1) as image_count, created_at
    FROM generations
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 20
  `, [userId]);

  const row = userResult.rows[0];
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    banned_at: row.banned_at || null,
    print_order_count: parseInt(row.print_order_count) || 0,
    print_order_total_cents: parseInt(row.print_order_total_cents) || 0,
    models_count: parseInt(row.models_count) || 0,
    generations_count: parseInt(row.generations_count) || 0,
    pending_trainings_count: parseInt(row.pending_trainings_count) || 0,
    created_at: row.created_at,
    last_activity: row.last_activity !== '1970-01-01T00:00:00.000Z' ? row.last_activity : null,
    printOrders: ordersResult.rows,
    models: modelsResult.rows,
    recentGenerations: generationsResult.rows,
  };
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
      u.banned_at,
      COALESCE((SELECT COUNT(*) FROM print_orders WHERE user_id = u.id AND status NOT IN ('failed', 'refunded')), 0) as print_order_count,
      COALESCE((SELECT SUM(total_cents) FROM print_orders WHERE user_id = u.id AND status NOT IN ('failed', 'refunded')), 0) as print_order_total_cents,
      (SELECT COUNT(*) FROM models WHERE user_id = u.id) as models_count,
      (SELECT COUNT(*) FROM generations WHERE user_id = u.id) as generations_count,
      (SELECT COUNT(*) FROM pending_trainings WHERE user_id = u.id) as pending_trainings_count,
      u.created_at,
      GREATEST(
        u.created_at,
        COALESCE((SELECT MAX(created_at) FROM models WHERE user_id = u.id), '1970-01-01'::timestamp),
        COALESCE((SELECT MAX(created_at) FROM generations WHERE user_id = u.id), '1970-01-01'::timestamp),
        COALESCE((SELECT MAX(created_at) FROM print_orders WHERE user_id = u.id), '1970-01-01'::timestamp)
      ) as last_activity
    FROM users u
    WHERE LOWER(u.email) LIKE $1 OR LOWER(COALESCE(u.name, '')) LIKE $1
    ORDER BY u.created_at DESC
    LIMIT $2
  `, [searchPattern, limit]);

  return result.rows.map(row => ({
    id: row.id,
    email: row.email,
    name: row.name,
    banned_at: row.banned_at || null,
    print_order_count: parseInt(row.print_order_count) || 0,
    print_order_total_cents: parseInt(row.print_order_total_cents) || 0,
    models_count: parseInt(row.models_count) || 0,
    generations_count: parseInt(row.generations_count) || 0,
    pending_trainings_count: parseInt(row.pending_trainings_count) || 0,
    created_at: row.created_at,
    last_activity: row.last_activity !== '1970-01-01T00:00:00.000Z' ? row.last_activity : null,
  }));
}

// Re-engagement: find users with models but no print purchases
export interface ReengagementUser {
  id: number;
  email: string;
  name: string | null;
  pet_names: string[];
  model_ids: number[];
  lora_urls: string[];
  pet_types: string[];
  training_date: string;
  last_activity: string | null;
  reengagement_sent_at: string | null;
}

export async function getReengagementEligibleUsers(): Promise<ReengagementUser[]> {
  const result = await pool.query(`
    SELECT
      u.id,
      u.email,
      u.name,
      ARRAY_AGG(m.trigger_word ORDER BY m.created_at DESC) as pet_names,
      ARRAY_AGG(m.id ORDER BY m.created_at DESC) as model_ids,
      ARRAY_AGG(m.lora_url ORDER BY m.created_at DESC) as lora_urls,
      ARRAY_AGG(COALESCE(m.pet_type, 'dog') ORDER BY m.created_at DESC) as pet_types,
      MIN(m.created_at) as training_date,
      GREATEST(
        u.created_at,
        COALESCE((SELECT MAX(created_at) FROM models WHERE user_id = u.id), '1970-01-01'::timestamp),
        COALESCE((SELECT MAX(created_at) FROM generations WHERE user_id = u.id), '1970-01-01'::timestamp),
        COALESCE((SELECT MAX(created_at) FROM print_orders WHERE user_id = u.id), '1970-01-01'::timestamp)
      ) as last_activity
    FROM users u
    INNER JOIN models m ON m.user_id = u.id
    WHERE NOT EXISTS (
      SELECT 1 FROM print_orders po
      WHERE po.user_id = u.id
        AND po.status NOT IN ('failed', 'refunded')
    )
    GROUP BY u.id, u.email, u.name, u.created_at
    ORDER BY MIN(m.created_at) DESC
  `);

  const sentMap = await getAdminConfig<Record<string, { sentAt: string; sentBy: string }>>('reengagement_sent_users') || {};

  return result.rows.map(row => ({
    id: row.id,
    email: row.email,
    name: row.name,
    pet_names: row.pet_names || [],
    model_ids: row.model_ids || [],
    lora_urls: row.lora_urls || [],
    pet_types: row.pet_types || [],
    training_date: row.training_date,
    last_activity: row.last_activity !== '1970-01-01T00:00:00.000Z' ? row.last_activity : null,
    reengagement_sent_at: sentMap[String(row.id)]?.sentAt || null,
  }));
}

// Get all users with trained models for print shop announcement
export interface PrintAnnouncementUser {
  id: number;
  email: string;
  name: string | null;
  pet_names: string[];
  training_date: string;
  announcement_sent_at: string | null;
}

export async function getPrintAnnouncementEligibleUsers(): Promise<PrintAnnouncementUser[]> {
  const result = await pool.query(`
    SELECT
      u.id,
      u.email,
      u.name,
      ARRAY_AGG(m.trigger_word ORDER BY m.created_at DESC) as pet_names,
      MIN(m.created_at) as training_date
    FROM users u
    INNER JOIN models m ON m.user_id = u.id
    GROUP BY u.id, u.email, u.name
    ORDER BY MIN(m.created_at) DESC
  `);

  const sentMap = await getAdminConfig<Record<string, { sentAt: string; sentBy: string }>>('print_announcement_sent_users') || {};

  return result.rows.map(row => ({
    id: row.id,
    email: row.email,
    name: row.name,
    pet_names: row.pet_names || [],
    training_date: row.training_date,
    announcement_sent_at: sentMap[String(row.id)]?.sentAt || null,
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

// Get all active trainings with full details needed for auto-completion
export interface ActiveTrainingForCompletion {
  id: number;
  user_id: number;
  fal_request_id: string;
  user_email: string;
  user_name: string;
  trigger_word: string;
  model_name: string;
  pet_type: string;
  images_count: number;
  status: string;
  created_at: Date;
}

export async function getActiveTrainingsForCompletion(): Promise<ActiveTrainingForCompletion[]> {
  const result = await pool.query(`
    SELECT
      pt.id,
      pt.user_id,
      pt.fal_request_id,
      u.email as user_email,
      COALESCE(u.name, '') as user_name,
      pt.trigger_word,
      pt.model_name,
      COALESCE(pt.pet_type, 'dog') as pet_type,
      pt.images_count,
      pt.status,
      pt.created_at
    FROM pending_trainings pt
    JOIN users u ON pt.user_id = u.id
    WHERE pt.status = 'training'
    ORDER BY pt.created_at ASC
  `);

  return result.rows;
}

// Get a single active training by ID with full details for completion
export async function getActiveTrainingById(trainingId: number): Promise<ActiveTrainingForCompletion | null> {
  const result = await pool.query(`
    SELECT
      pt.id,
      pt.user_id,
      pt.fal_request_id,
      u.email as user_email,
      COALESCE(u.name, '') as user_name,
      pt.trigger_word,
      pt.model_name,
      COALESCE(pt.pet_type, 'dog') as pet_type,
      pt.images_count,
      pt.status,
      pt.created_at
    FROM pending_trainings pt
    JOIN users u ON pt.user_id = u.id
    WHERE pt.id = $1
  `, [trainingId]);

  return result.rows[0] || null;
}

// Get trainings stuck for more than N minutes
export async function getStuckTrainings(minutesOld: number): Promise<PendingTraining[]> {
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
    WHERE pt.status = 'training'
      AND pt.created_at < NOW() - INTERVAL '1 minute' * $1
    ORDER BY pt.created_at ASC
  `, [minutesOld]);

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

