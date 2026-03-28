import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import cors from 'cors';
import nodemailer from 'nodemailer';

// Načtení environment variables
dotenv.config();

// Inicializace Workeru (spustí se v rámci stejného procesu pro Render Free Tier)
import './server/worker';

async function startServer() {
    const app = express();
    
    // Render automaticky nastavuje process.env.PORT
    // AI Studio používá port 3000
    const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

    app.use(cors());
    app.use(express.json());

    // --- 0. SPUŠTĚNÍ MIGRACÍ ---
    try {
        console.log('Kontrola a spuštění databázových migrací...');
        const { migrate } = await import('./server/migrate');
        await migrate();
    } catch (error) {
        console.error('Chyba při spouštění migrací:', error);
    }

    // --- 1. HEALTH CHECK ENDPOINT (Pro Render) ---
    app.get('/health', (req, res) => {
        res.status(200).json({ 
            status: 'ok', 
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            worker: 'running'
        });
    });

    // --- 1.5. VERIFY CONNECTIONS ENDPOINT ---
    app.get('/api/system/verify-connections', async (req, res) => {
        const results: any = {
            database: { status: 'untested', message: '' },
            redis: { status: 'untested', message: '' },
            environment: {
                DATABASE_URL: process.env.DATABASE_URL ? `Nastaveno (délka: ${process.env.DATABASE_URL.length}, začíná na: ${process.env.DATABASE_URL.substring(0, 11)}...)` : 'Chybí',
                REDIS_URL: process.env.REDIS_URL ? `Nastaveno (délka: ${process.env.REDIS_URL.length}, začíná na: ${process.env.REDIS_URL.substring(0, 9)}...)` : 'Chybí',
                AES_ENCRYPTION_KEY: process.env.AES_ENCRYPTION_KEY ? `Nastaveno (délka: ${process.env.AES_ENCRYPTION_KEY.length} znaků - MUSÍ BÝT PŘESNĚ 32!)` : 'Chybí',
                TRACKING_DOMAIN: process.env.TRACKING_DOMAIN ? `Nastaveno (${process.env.TRACKING_DOMAIN})` : 'Chybí'
            }
        };

        // Test PostgreSQL
        try {
            const { pool } = await import('./server/db');
            const client = await pool.connect();
            const dbRes = await client.query('SELECT NOW()');
            client.release();
            results.database = { status: 'success', message: `Připojeno k DB. Čas serveru: ${dbRes.rows[0].now}` };
        } catch (error: any) {
            console.error('DB Connection Test Error:', error);
            results.database = { 
                status: 'error', 
                message: error.message || 'Neznámá chyba při připojení k DB',
                details: {
                    code: error.code,
                    name: error.name,
                    stack: error.stack
                }
            };
        }

        // Test Redis
        try {
            const { redisConnection } = await import('./server/worker');
            if (redisConnection) {
                const pingRes = await redisConnection.ping();
                results.redis = { status: 'success', message: `Připojeno k Redis. Odpověď: ${pingRes}` };
            } else {
                results.redis = { status: 'warning', message: 'Redis není nakonfigurován (REDIS_URL chybí).' };
            }
        } catch (error: any) {
            results.redis = { status: 'error', message: error.message };
        }

        res.json(results);
    });

    // --- 2. API ROUTES PRO KONTAKTY ---
    app.get('/api/contacts', async (req, res) => {
        try {
            const { pool } = await import('./server/db');
            const result = await pool.query('SELECT * FROM contacts ORDER BY created_at DESC');
            res.json({ success: true, data: result.rows });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.put('/api/contacts/:id', async (req, res) => {
        const { id } = req.params;
        const { first_name, last_name, email, custom_fields } = req.body;
        try {
            const { pool } = await import('./server/db');
            await pool.query(
                'UPDATE contacts SET first_name = $1, last_name = $2, email = $3, custom_fields = $4 WHERE id = $5',
                [first_name, last_name, email, custom_fields, id]
            );
            res.json({ success: true });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.delete('/api/contacts/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const { pool } = await import('./server/db');
            await pool.query('DELETE FROM contacts WHERE id = $1', [id]);
            res.json({ success: true });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.post('/api/contacts/batch', async (req, res) => {
        const { contacts } = req.body;
        if (!contacts || !Array.isArray(contacts)) {
            return res.status(400).json({ success: false, error: 'Neplatná data' });
        }

        try {
            const { pool } = await import('./server/db');
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                let insertedCount = 0;
                
                // Získáme admin uživatele (pro zjednodušení přiřadíme vše prvnímu uživateli)
                const userRes = await client.query('SELECT id FROM users LIMIT 1');
                const userId = userRes.rows[0]?.id;
                
                if (!userId) {
                    throw new Error('V databázi není žádný uživatel. Spusťte nejprve migraci.');
                }

                for (const contact of contacts) {
                    // Rozdělení jména na first_name a last_name (zjednodušeně)
                    const nameParts = (contact.name || '').split(' ');
                    const firstName = nameParts[0] || '';
                    const lastName = nameParts.slice(1).join(' ') || '';
                    
                    const customFields = {
                        company: contact.company || '',
                        role: contact.role || ''
                    };

                    await client.query(`
                        INSERT INTO contacts (user_id, email, first_name, last_name, custom_fields, status)
                        VALUES ($1, $2, $3, $4, $5, $6)
                        ON CONFLICT (user_id, email) DO UPDATE 
                        SET first_name = EXCLUDED.first_name, 
                            last_name = EXCLUDED.last_name,
                            custom_fields = EXCLUDED.custom_fields
                    `, [userId, contact.email, firstName, lastName, customFields, contact.status || 'active']);
                    insertedCount++;
                }
                await client.query('COMMIT');
                res.json({ success: true, message: `Úspěšně uloženo ${insertedCount} kontaktů.` });
            } catch (e) {
                await client.query('ROLLBACK');
                throw e;
            } finally {
                client.release();
            }
        } catch (error: any) {
            console.error('Chyba při ukládání kontaktů:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // --- 3. API ROUTES PRO SMTP ÚČTY ---
    app.get('/api/accounts', async (req, res) => {
        try {
            const { pool } = await import('./server/db');
            const result = await pool.query('SELECT id, email, smtp_host, smtp_port, smtp_user, daily_limit, sent_today as sent, status, last_error_message as error_message FROM smtp_accounts ORDER BY created_at DESC');
            res.json({ success: true, data: result.rows });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.post('/api/accounts/batch', async (req, res) => {
        const { accounts } = req.body;
        if (!accounts || !Array.isArray(accounts)) {
            return res.status(400).json({ success: false, error: 'Neplatná data' });
        }

        try {
            const { pool } = await import('./server/db');
            const { encrypt } = await import('./server/encryption');
            const client = await pool.connect();
            
            try {
                await client.query('BEGIN');
                let insertedCount = 0;
                
                const userRes = await client.query('SELECT id FROM users LIMIT 1');
                const userId = userRes.rows[0]?.id;
                
                if (!userId) throw new Error('V databázi není žádný uživatel.');

                for (const acc of accounts) {
                    // Šifrování hesla
                    const encryptedPass = encrypt(acc.smtp_pass);
                    
                    await client.query(`
                        INSERT INTO smtp_accounts (user_id, email, smtp_host, smtp_port, smtp_user, smtp_pass_encrypted, imap_host, imap_port, daily_limit, status)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    `, [
                        userId, 
                        acc.email, 
                        acc.smtp_host, 
                        acc.smtp_port, 
                        acc.smtp_user, 
                        encryptedPass, 
                        acc.smtp_host, // imap host (zjednodušeně stejný)
                        993,           // imap port
                        acc.limit || 50,
                        acc.status || 'unverified'
                    ]);
                    insertedCount++;
                }
                await client.query('COMMIT');
                res.json({ success: true, message: `Úspěšně uloženo ${insertedCount} účtů.` });
            } catch (e) {
                await client.query('ROLLBACK');
                throw e;
            } finally {
                client.release();
            }
        } catch (error: any) {
            console.error('Chyba při ukládání účtů:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.post('/api/accounts/:id/verify', async (req, res) => {
        const { id } = req.params;
        try {
            const { pool } = await import('./server/db');
            const { decrypt } = await import('./server/encryption');
            
            const accountRes = await pool.query('SELECT * FROM smtp_accounts WHERE id = $1', [id]);
            if (accountRes.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Účet nenalezen' });
            }
            
            const account = accountRes.rows[0];
            let pass = '';
            try {
                pass = decrypt(account.smtp_pass_encrypted);
            } catch (e) {
                await pool.query('UPDATE smtp_accounts SET status = $1, last_error_message = $2 WHERE id = $3', ['error', 'Chyba dešifrování hesla', id]);
                return res.status(500).json({ success: false, error: 'Chyba dešifrování hesla' });
            }

            const transporter = nodemailer.createTransport({
                host: account.smtp_host,
                port: Number(account.smtp_port),
                secure: Number(account.smtp_port) === 465,
                auth: {
                    user: account.smtp_user,
                    pass: pass
                },
                tls: {
                    rejectUnauthorized: false
                },
                // Vynucení IPv4 (často řeší problémy s ESOCKET/Timeout na cloudu)
                family: 4,
                // Zvýšení timeoutů na 30 sekund (některé servery jsou pomalejší)
                connectionTimeout: 30000,
                greetingTimeout: 30000,
                socketTimeout: 30000
            } as any);

            try {
                await transporter.verify();
                await pool.query('UPDATE smtp_accounts SET status = $1, last_error_message = NULL WHERE id = $2', ['active', id]);
                res.json({ success: true, message: 'Připojení k SMTP bylo úspěšné!' });
            } catch (error: any) {
                let errorMessage = error.message || 'Nepodařilo se připojit k SMTP serveru.';
                if (error.code === 'ETIMEDOUT') {
                    errorMessage = `Timeout: Server neodpověděl včas. Zkontrolujte port a firewall. (${error.address || account.smtp_host}:${error.port || account.smtp_port})`;
                } else if (error.code === 'EAUTH') {
                    errorMessage = `Chyba přihlášení: Nesprávné jméno nebo heslo. (Odpověď serveru: ${error.response})`;
                } else if (error.code === 'ESOCKET') {
                    errorMessage = `Chyba sítě: Nelze navázat spojení. (${error.command || 'Neznámý příkaz'})`;
                } else if (error.code === 'ENOTFOUND') {
                    errorMessage = `Chyba DNS: Server ${account.smtp_host} nebyl nalezen.`;
                }
                
                await pool.query('UPDATE smtp_accounts SET status = $1, last_error_message = $2 WHERE id = $3', ['error', errorMessage, id]);
                res.status(400).json({ success: false, error: errorMessage });
            }
        } catch (error: any) {
            console.error('Verify Account Error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // --- 4. API ROUTES PRO KAMPANĚ ---
    app.get('/api/campaigns', async (req, res) => {
        try {
            const { pool } = await import('./server/db');
            const result = await pool.query(`
                SELECT c.*, 
                       COUNT(DISTINCT cc.contact_id) as contacts_count,
                       COUNT(DISTINCT cs.id) as steps_count
                FROM campaigns c
                LEFT JOIN campaign_contacts cc ON c.id = cc.campaign_id
                LEFT JOIN campaign_steps cs ON c.id = cs.campaign_id
                GROUP BY c.id
                ORDER BY c.created_at DESC
            `);
            res.json({ success: true, data: result.rows });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.post('/api/campaigns', async (req, res) => {
        const { name } = req.body;
        if (!name) return res.status(400).json({ success: false, error: 'Název kampaně je povinný' });

        try {
            const { pool } = await import('./server/db');
            const userRes = await pool.query('SELECT id FROM users LIMIT 1');
            const userId = userRes.rows[0]?.id;
            
            if (!userId) throw new Error('V databázi není žádný uživatel.');

            const result = await pool.query(
                'INSERT INTO campaigns (user_id, name) VALUES ($1, $2) RETURNING *',
                [userId, name]
            );
            
            // Vytvoření výchozího kroku
            await pool.query(
                'INSERT INTO campaign_steps (campaign_id, subject, body, step_number) VALUES ($1, $2, $3, $4)',
                [result.rows[0].id, 'Předmět e-mailu', 'Obsah e-mailu...', 1]
            );

            res.json({ success: true, data: result.rows[0] });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.get('/api/campaigns/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const { pool } = await import('./server/db');
            
            // Kampaň
            const campaignRes = await pool.query('SELECT * FROM campaigns WHERE id = $1', [id]);
            if (campaignRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Kampaň nenalezena' });
            
            // Kroky
            const stepsRes = await pool.query('SELECT * FROM campaign_steps WHERE campaign_id = $1 ORDER BY step_number ASC', [id]);
            
            // Kontakty v kampani
            const contactsRes = await pool.query(`
                SELECT c.*, cc.status as campaign_status, cc.current_step
                FROM contacts c
                JOIN campaign_contacts cc ON c.id = cc.contact_id
                WHERE cc.campaign_id = $1
            `, [id]);

            res.json({ 
                success: true, 
                data: {
                    ...campaignRes.rows[0],
                    steps: stepsRes.rows,
                    contacts: contactsRes.rows
                }
            });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.put('/api/campaigns/:id/steps/:stepId', async (req, res) => {
        const { id, stepId } = req.params;
        const { subject, body } = req.body;
        
        try {
            const { pool } = await import('./server/db');
            await pool.query(
                'UPDATE campaign_steps SET subject = $1, body = $2 WHERE id = $3 AND campaign_id = $4',
                [subject, body, stepId, id]
            );
            res.json({ success: true });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.post('/api/campaigns/:id/contacts', async (req, res) => {
        const { id } = req.params;
        const { contactIds } = req.body; // Pole ID kontaktů
        
        if (!contactIds || !Array.isArray(contactIds)) {
            return res.status(400).json({ success: false, error: 'Neplatná data' });
        }

        try {
            const { pool } = await import('./server/db');
            const client = await pool.connect();
            
            try {
                await client.query('BEGIN');
                for (const contactId of contactIds) {
                    await client.query(`
                        INSERT INTO campaign_contacts (campaign_id, contact_id) 
                        VALUES ($1, $2) 
                        ON CONFLICT DO NOTHING
                    `, [id, contactId]);
                }
                await client.query('COMMIT');
                res.json({ success: true });
            } catch (e) {
                await client.query('ROLLBACK');
                throw e;
            } finally {
                client.release();
            }
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.delete('/api/campaigns/:id/contacts/:contactId', async (req, res) => {
        const { id, contactId } = req.params;
        try {
            const { pool } = await import('./server/db');
            await pool.query('DELETE FROM campaign_contacts WHERE campaign_id = $1 AND contact_id = $2', [id, contactId]);
            res.json({ success: true });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.post('/api/campaigns/:id/test', async (req, res) => {
        const { id } = req.params;
        const { testEmail, accountId, stepId } = req.body;

        if (!testEmail || !accountId || !stepId) {
            return res.status(400).json({ success: false, error: 'Chybí parametry (testEmail, accountId, stepId)' });
        }

        try {
            const { pool } = await import('./server/db');
            const { decrypt } = await import('./server/encryption');
            
            // Získání kroku kampaně
            const stepRes = await pool.query('SELECT subject, body FROM campaign_steps WHERE id = $1 AND campaign_id = $2', [stepId, id]);
            if (stepRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Krok kampaně nenalezen' });
            const step = stepRes.rows[0];

            // Získání SMTP účtu
            const accountRes = await pool.query('SELECT * FROM smtp_accounts WHERE id = $1 AND status = $2', [accountId, 'active']);
            if (accountRes.rows.length === 0) return res.status(404).json({ success: false, error: 'SMTP účet nenalezen nebo není aktivní' });
            const account = accountRes.rows[0];

            const pass = decrypt(account.smtp_pass_encrypted);

            const transporter = nodemailer.createTransport({
                host: account.smtp_host,
                port: Number(account.smtp_port),
                secure: Number(account.smtp_port) === 465,
                auth: { user: account.smtp_user, pass: pass },
                tls: { rejectUnauthorized: false },
                family: 4,
                connectionTimeout: 10000
            } as any);

            await transporter.sendMail({
                from: `"${account.smtp_user}" <${account.email}>`,
                to: testEmail,
                subject: `[TEST] ${step.subject}`,
                html: step.body
            });

            res.json({ success: true, message: 'Testovací e-mail odeslán' });
        } catch (error: any) {
            console.error('Test Email Error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // --- 5. SMTP VERIFICATION ENDPOINT (Pro ruční testování bez uložení) ---
    app.post('/api/smtp/verify', async (req, res) => {
        const { host, port, secure, user, pass } = req.body;

        if (!host || !port || !user || !pass) {
            return res.status(400).json({ success: false, error: 'Chybí povinné parametry (host, port, user, pass)' });
        }

        try {
            const transporter = nodemailer.createTransport({
                host: host, // Použijeme původní hostname
                port: parseInt(port, 10),
                secure: secure !== undefined ? secure : parseInt(port, 10) === 465,
                auth: {
                    user,
                    pass
                },
                tls: {
                    rejectUnauthorized: false // Pro testovací účely ignorujeme self-signed certifikáty
                },
                // Vynucení IPv4
                family: 4,
                // Zvýšení timeoutů na 30 sekund
                connectionTimeout: 30000,
                greetingTimeout: 30000,
                socketTimeout: 30000
            } as any);

            // Verify connection configuration
            await transporter.verify();
            res.json({ success: true, message: 'Připojení k SMTP bylo úspěšné!' });
        } catch (error: any) {
            console.error('SMTP Verify Error:', error);
            
            // Sestavení detailní chybové zprávy pro UI
            let errorMessage = error.message || 'Nepodařilo se připojit k SMTP serveru.';
            if (error.code === 'ETIMEDOUT') {
                errorMessage = `Timeout: Server neodpověděl včas. Zkontrolujte port a firewall. (${error.address || host}:${error.port || port})`;
            } else if (error.code === 'EAUTH') {
                errorMessage = `Chyba přihlášení: Nesprávné jméno nebo heslo. (Odpověď serveru: ${error.response})`;
            } else if (error.code === 'ESOCKET') {
                errorMessage = `Chyba sítě: Nelze navázat spojení. (${error.command || 'Neznámý příkaz'})`;
            } else if (error.code === 'ENOTFOUND') {
                errorMessage = `Chyba DNS: Server ${host} nebyl nalezen.`;
            }

            res.status(500).json({ 
                success: false, 
                error: errorMessage,
                details: {
                    code: error.code,
                    command: error.command,
                    response: error.response
                }
            });
        }
    });

    // --- 3. OPEN TRACKING ENDPOINT ---
    const PIXEL_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    app.get('/t/open/:tracking_id', async (req, res) => {
        const trackingId = req.params.tracking_id;
        // Zde by byla logika pro update databáze:
        // await pool.query("UPDATE sending_logs SET opened_at = NOW() WHERE tracking_id = $1", [trackingId]);
        
        res.writeHead(200, {
            'Content-Type': 'image/gif',
            'Content-Length': PIXEL_GIF.length,
            'Cache-Control': 'no-store, no-cache, must-revalidate, private'
        });
        res.end(PIXEL_GIF);
    });

    // --- 3. VITE MIDDLEWARE (Dev) / STATIC FILES (Prod) ---
    if (process.env.NODE_ENV !== 'production') {
        // Vývojové prostředí: Vite middleware
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa'
        });
        app.use(vite.middlewares);
    } else {
        // Produkční prostředí (Render): Servírování zkompilovaných statických souborů
        const distPath = path.join(process.cwd(), 'dist');
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
            res.sendFile(path.join(distPath, 'index.html'));
        });
    }

    // Spuštění serveru
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n🚀 Web Server běží na portu ${PORT}`);
        console.log(`👉 Health check: http://localhost:${PORT}/health\n`);
    });
}

startServer().catch(err => {
    console.error('Kritická chyba při startu serveru:', err);
    process.exit(1);
});
