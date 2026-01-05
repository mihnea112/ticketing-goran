import { Pool } from 'pg';
import dotenv from 'dotenv';

// Încarcă variabilele din .env doar dacă suntem local
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// Configurare pentru producție (SSL necesar pentru Supabase/Neon/Railway)
const isProduction = process.env.NODE_ENV === 'production';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is missing from environment variables');
}

export const pool = new Pool({
  connectionString,
  ssl: isProduction 
    ? { rejectUnauthorized: false } // Necesar pentru multe DB-uri cloud free tier
    : false, 
});