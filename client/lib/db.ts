import { Pool } from "pg";

declare global {
  var pool: Pool | undefined;
}

let pool: Pool;

// 2. Verificăm dacă există deja conexiunea (pentru a evita "Too many connections" în dev)
if (!global.pool) {
  global.pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // SSL este necesar pentru Supabase în producție
    ssl: { rejectUnauthorized: false }, 
    max: 10, // Maxim 10 conexiuni per instanță serverless
  });
}

pool = global.pool;

export default pool;