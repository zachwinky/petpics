import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function addCredits(userEmail: string, creditsToAdd: number) {
  try {
    // Get user
    const userResult = await pool.query(
      'SELECT id, email, credits_balance FROM users WHERE email = $1',
      [userEmail]
    );

    if (userResult.rows.length === 0) {
      console.error(`User not found: ${userEmail}`);
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log(`Found user: ${user.email} (ID: ${user.id})`);
    console.log(`Current balance: ${user.credits_balance}`);

    // Add credits
    await pool.query(
      'UPDATE users SET credits_balance = credits_balance + $1 WHERE id = $2',
      [creditsToAdd, user.id]
    );

    console.log(`✓ Added ${creditsToAdd} credits`);
    console.log(`New balance: ${user.credits_balance + creditsToAdd}`);

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Get email and amount from command line
const email = process.argv[2];
const amount = parseInt(process.argv[3]);

if (!email || !amount || isNaN(amount)) {
  console.error('Usage: tsx scripts/add-credits.ts <email> <amount>');
  process.exit(1);
}

addCredits(email, amount);
