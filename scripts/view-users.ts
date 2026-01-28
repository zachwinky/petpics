import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || process.env.PRISMA_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL.split('\n')[0].replace(/^PRISMA_DATABASE_URL="/, '').replace(/"$/, ''),
});

async function viewUsers() {
  try {
    const result = await pool.query(
      `SELECT id, name, email, credits_balance, created_at
       FROM users
       ORDER BY created_at DESC`
    );

    console.log('\n=== Users ===\n');
    console.table(result.rows);
    console.log(`\nTotal users: ${result.rows.length}`);

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

viewUsers();
