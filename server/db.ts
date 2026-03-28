import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const dbUrl = process.env.DATABASE_URL || '';
const isSupabase = dbUrl.includes('supabase') || dbUrl.includes('pooler.supabase.com');

// Připojení k Supabase (nebo jiné PostgreSQL databázi)
export const pool = new Pool({
    connectionString: dbUrl,
    // Supabase vyžaduje SSL pro externí připojení. Použijeme robustnější nastavení.
    ssl: isSupabase ? { 
        rejectUnauthorized: false, // Často nutné pro cloudové DB, pokud nemáme CA certifikát
    } : undefined
});

// Test připojení
pool.on('connect', () => {
    console.log('✅ Připojeno k PostgreSQL databázi (Supabase).');
});

pool.on('error', (err) => {
    console.error('❌ Neočekávaná chyba na PostgreSQL klientovi', err);
    process.exit(-1);
});
