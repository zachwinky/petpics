import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function initDatabase() {
  const connectionString = process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;

  if (!connectionString) {
    throw new Error('POSTGRES_URL or POSTGRES_URL_NON_POOLING environment variable is required');
  }

  console.log('Using connection string from env...');

  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Initializing database...');
    console.log('Connecting to database...');

    await client.connect();
    console.log('Connected successfully!');

    // Read schema file
    const schemaPath = path.join(process.cwd(), 'db', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Remove comment-only lines, then split by semicolons
    const cleanedSchema = schema
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 && !trimmed.startsWith('--');
      })
      .join('\n');

    const statements = cleanedSchema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await client.query(statement);
        console.log(`[${i+1}/${statements.length}] Executed:`, statement.substring(0, 60) + '...');
      } catch (err) {
        console.error(`Error on statement ${i+1}:`, statement.substring(0, 100));
        throw err;
      }
    }

    console.log('Database initialized successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

initDatabase();
