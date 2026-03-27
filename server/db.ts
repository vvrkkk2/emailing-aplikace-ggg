import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Připojení k Supabase (nebo jiné PostgreSQL databázi)
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Supabase vyžaduje SSL pro externí připojení
    ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : undefined
});

// Test připojení
pool.on('connect', () => {
    console.log('✅ Připojeno k PostgreSQL databázi (Supabase).');
});

pool.on('error', (err) => {
    console.error('❌ Neočekávaná chyba na PostgreSQL klientovi', err);
    process.exit(-1);
});
