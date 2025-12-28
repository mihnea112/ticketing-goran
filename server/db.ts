// server/db.ts
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Creăm o "piscină" de conexiuni (Pool)
// Asta permite serverului să gestioneze mai mulți utilizatori simultan
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Necesar pentru conexiuni Supabase din cloud
  }
});

// Helper pentru a rula query-uri rapid
export const query = (text: string, params?: any[]) => pool.query(text, params);