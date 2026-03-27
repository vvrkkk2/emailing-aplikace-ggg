import { pool } from './db';
import { encrypt } from './encryption';

async function seed() {
    console.log('🌱 Spouštím seedování databáze...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Vytvoření testovacího uživatele (pokud neexistuje)
        const userResult = await client.query(`
            INSERT INTO users (email, password_hash)
            VALUES (
                'test@coldmail.pro', 
                crypt('TestPassword123!', gen_salt('bf'))
            )
            ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
            RETURNING id;
        `);
        
        const userId = userResult.rows[0].id;
        console.log(\`✅ Uživatel vytvořen/nalezen s ID: \${userId}\`);

        // 2. Vytvoření ukázkového SMTP účtu
        const encryptedPassword = encrypt('dummy-smtp-password');
        
        // Zkontrolujeme, jestli už účet neexistuje, abychom nevytvářeli duplikáty při opakovaném spuštění
        const existingSmtp = await client.query('SELECT id FROM smtp_accounts WHERE email = $1', ['hello@mojefirma.cz']);
        
        if (existingSmtp.rows.length === 0) {
            await client.query(`
                INSERT INTO smtp_accounts (
                    user_id, email, smtp_host, smtp_port, smtp_user, 
                    smtp_pass_encrypted, imap_host, imap_port, status
                )
                VALUES (
                    $1, 'hello@mojefirma.cz', 'smtp.mojefirma.cz', 465, 'hello@mojefirma.cz',
                    $2, 'imap.mojefirma.cz', 993, 'active'
                );
            `, [userId, encryptedPassword]);
            console.log(\`✅ Ukázkový SMTP účet byl přidán.\`);
        } else {
            console.log(\`ℹ️ Ukázkový SMTP účet již existuje, přeskakuji.\`);
        }

        // 3. Vytvoření ukázkové kampaně
        const campaignResult = await client.query(`
            INSERT INTO campaigns (user_id, name, status)
            VALUES ($1, 'Moje první B2B kampaň', 'active')
            RETURNING id;
        `, [userId]);
        
        const campaignId = campaignResult.rows[0].id;
        console.log(\`✅ Ukázková kampaň byla vytvořena.\`);

        // 4. Přidání statistik pro dnešní den, aby grafy nebyly prázdné
        await client.query(`
            INSERT INTO daily_stats (date, campaign_id, sent_count, open_count, reply_count)
            VALUES (CURRENT_DATE, $1, 45, 12, 3)
            ON CONFLICT DO NOTHING;
        `, [campaignId]);

        console.log(\`✅ Ukázkové statistiky byly přidány.\`);

        await client.query('COMMIT');
        console.log('🎉 Seedování úspěšně dokončeno!');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Seedování selhalo:', error);
    } finally {
        client.release();
    }
}

// Umožňuje spuštění skriptu napřímo: npx tsx server/seed.ts
if (import.meta.url === \`file://\${process.argv[1]}\`) {
    seed().then(() => process.exit(0));
}

export { seed };
