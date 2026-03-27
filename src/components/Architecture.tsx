import { Database, Code, ShieldCheck, Timer, Inbox, Wand2, MailWarning, Eye, BarChart, Server, Key, FileCode2, Cloud } from 'lucide-react';

export function Architecture() {
  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Architektura & Kód (Produkce)</h1>
        <p className="text-gray-500 mt-2 text-lg">
          Rozšířený návrh pro reálný provoz: Render.com, Supabase (PostgreSQL) a Upstash (Redis).
        </p>
      </div>

      <div className="space-y-12">
        {/* --- DEPLOYMENT & DEVOPS SECTION --- */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Cloud className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">DevOps & Nasazení (Render + Supabase + Upstash)</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Aplikace je připravena pro nasazení na <strong>Render.com</strong> (Free/Hobby tier). Webový server a BullMQ worker běží v jednom procesu. Databáze je hostována na <strong>Supabase</strong> a Redis na <strong>Upstash</strong> (s podporou TLS).
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Server.ts */}
            <div className="bg-gray-900 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-3 text-indigo-300">
                <Server className="w-4 h-4" />
                <h3 className="font-semibold">server.ts (Express + Vite + Worker)</h3>
              </div>
              <pre className="text-xs text-gray-300 font-mono leading-relaxed overflow-x-auto">
{`import express from 'express';
import { createServer as createViteServer } from 'vite';
import './server/worker'; // Spustí BullMQ workera ve stejném procesu

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000; // Render dodá PORT

// Health check pro Render
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Vite Middleware (Dev) / Static files (Prod)
if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true } });
    app.use(vite.middlewares);
} else {
    app.use(express.static('dist'));
}

app.listen(PORT, '0.0.0.0', () => console.log(\`Server běží na \${PORT}\`));`}
              </pre>
            </div>

            {/* Package.json */}
            <div className="bg-gray-900 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-3 text-indigo-300">
                <FileCode2 className="w-4 h-4" />
                <h3 className="font-semibold">package.json (Scripts)</h3>
              </div>
              <pre className="text-xs text-gray-300 font-mono leading-relaxed overflow-x-auto">
{`"scripts": {
  "dev": "tsx server.ts",
  "build": "vite build",
  "start": "NODE_ENV=production tsx server.ts",
  "migrate": "tsx server/migrate.ts"
}

// Render Build Command:
// npm install && npm run build && npm run migrate

// Render Start Command:
// npm run start`}
              </pre>
            </div>
          </div>
        </section>

        {/* Database & Redis Configuration */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Konfigurace Databáze & Redis</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Připojení k Supabase (vyžaduje SSL) a Upstash Redis (vyžaduje TLS).
          </p>
          <div className="bg-gray-900 rounded-xl p-6 overflow-x-auto shadow-lg">
            <pre className="text-sm text-blue-300 font-mono leading-relaxed">
{`// server/db.ts (Supabase PostgreSQL)
import { Pool } from 'pg';
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('supabase') 
         ? { rejectUnauthorized: false } : undefined
});

// server/worker.ts (Upstash Redis)
import IORedis from 'ioredis';
const connection = new IORedis(process.env.REDIS_URL, {
    tls: process.env.REDIS_URL?.includes('upstash') 
         ? { rejectUnauthorized: false } : undefined,
    maxRetriesPerRequest: null
});`}
            </pre>
          </div>
        </section>

        {/* AES Encryption */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Key className="w-5 h-5 text-yellow-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Zabezpečení hesel (AES-256)</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Hesla k SMTP účtům jsou v databázi šifrována pomocí <code>server/encryption.ts</code>. K dešifrování dochází až těsně před odesláním e-mailu.
          </p>
          <div className="bg-gray-900 rounded-xl p-6 overflow-x-auto shadow-lg">
            <pre className="text-sm text-yellow-300 font-mono leading-relaxed">
{`import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.AES_ENCRYPTION_KEY; // 32 znaků z .env
const IV_LENGTH = 16;

export function encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}`}
            </pre>
          </div>
        </section>

        {/* 1. SQL Schema */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">1. Aktualizované SQL Schéma</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Přidáno pole <code>last_error_message</code>, tabulka <code>daily_stats</code> a podpora pro Open Tracking.
          </p>
          <div className="bg-gray-900 rounded-xl p-6 overflow-x-auto shadow-lg">
            <pre className="text-sm text-blue-300 font-mono leading-relaxed">
{`CREATE TABLE smtp_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    -- ... (přihlašovací údaje) ...
    daily_limit INT DEFAULT 50,
    sent_today INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active', -- active, paused, error
    last_error_message TEXT,             -- NOVÉ: Pro zobrazení v UI
    last_used_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- active, unsubscribed, replied, invalid_email
    -- ...
);

CREATE TABLE sending_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_id UUID UNIQUE DEFAULT gen_random_uuid(), -- NOVÉ: Pro 1x1 pixel
    campaign_id UUID REFERENCES campaigns(id),
    contact_id UUID REFERENCES contacts(id),
    smtp_account_id UUID REFERENCES smtp_accounts(id),
    status VARCHAR(50) NOT NULL, -- sent, opened, replied, bounced, failed
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    opened_at TIMESTAMP WITH TIME ZONE,                  -- NOVÉ: Čas otevření
    error_message TEXT
);

-- NOVÉ: Agregační tabulka pro bleskový Dashboard
CREATE TABLE daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    sent_count INT DEFAULT 0,
    open_count INT DEFAULT 0,
    reply_count INT DEFAULT 0,
    bounce_count INT DEFAULT 0,
    UNIQUE(date, campaign_id)
);`}
            </pre>
          </div>
        </section>

        {/* 2. Robust Sending Engine */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <MailWarning className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">2. SMTP Error Handling & Auto-pause</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Pokud účet selže (např. Rate Limit), je okamžitě pozastaven a worker zkusí další účet v rotaci.
          </p>
          <div className="bg-gray-900 rounded-xl p-6 overflow-x-auto shadow-lg">
            <pre className="text-sm text-red-300 font-mono leading-relaxed">
{`async function sendEmailWithRotation(campaignId, contact, maxRetries = 3) {
    let attempts = 0;
    
    while (attempts < maxRetries) {
        const client = await pool.connect();
        let accountId = null;

        try {
            await client.query('BEGIN');

            // 1. Najdi dostupný účet
            const accountRes = await client.query(\`
                SELECT * FROM smtp_accounts 
                WHERE status = 'active' AND sent_today < daily_limit
                ORDER BY last_used_at ASC NULLS FIRST LIMIT 1 FOR UPDATE SKIP LOCKED
            \`);

            if (accountRes.rows.length === 0) {
                throw new Error('Žádný dostupný SMTP účet s volným limitem.');
            }

            const account = accountRes.rows[0];
            accountId = account.id;

            // 2. Vytvoř log a získej tracking_id pro Open Tracking
            const logRes = await client.query(\`
                INSERT INTO sending_logs (campaign_id, contact_id, smtp_account_id, status)
                VALUES ($1, $2, $3, 'sending') RETURNING tracking_id, id
            \`, [campaignId, contact.id, account.id]);
            
            const trackingId = logRes.rows[0].tracking_id;
            const logId = logRes.rows[0].id;

            // 3. Připojení 1x1 pixelu do těla e-mailu
            const trackingPixel = \`<img src="https://api.coldmail.pro/t/open/\${trackingId}" width="1" height="1" alt="" />\`;
            const finalHtmlBody = parsedBody + trackingPixel;

            // 4. Odeslání přes Nodemailer
            const transporter = nodemailer.createTransport({ /* ... auth ... */ });
            await transporter.sendMail({
                from: account.email,
                to: contact.email,
                html: finalHtmlBody
            });

            // 5. Úspěch - aktualizace limitů
            await client.query(\`UPDATE smtp_accounts SET sent_today = sent_today + 1, last_used_at = NOW() WHERE id = $1\`, [account.id]);
            await client.query(\`UPDATE sending_logs SET status = 'sent' WHERE id = $1\`, [logId]);
            await client.query('COMMIT');
            
            return true; // Úspěšně odesláno

        } catch (error) {
            await client.query('ROLLBACK');
            
            // AUTO-PAUSE LOGIKA
            if (accountId && (error.responseCode >= 400 || error.code === 'ETIMEDOUT' || error.message.includes('limit'))) {
                console.error(\`Účet \${accountId} selhal. Důvod: \${error.message}. Pozastavuji účet.\`);
                
                // Označíme účet jako 'error' a uložíme zprávu pro Dashboard
                await pool.query(\`
                    UPDATE smtp_accounts 
                    SET status = 'error', last_error_message = $1 
                    WHERE id = $2
                \`, [error.message, accountId]);
                
                attempts++;
                continue; // Smyčka se zopakuje a vybere DALŠÍ dostupný účet v rotaci
            }
            
            throw error; // Jiná kritická chyba
        } finally {
            client.release();
        }
    }
    throw new Error('Všechny pokusy o odeslání selhaly. Zkontrolujte SMTP účty.');
}`}
            </pre>
          </div>
        </section>

        {/* 3. Open Tracking */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Eye className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">3. API Endpoint pro Open Tracking</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Express.js endpoint, který vrátí 1x1 transparentní GIF a zaznamená čas otevření.
          </p>
          <div className="bg-gray-900 rounded-xl p-6 overflow-x-auto shadow-lg">
            <pre className="text-sm text-purple-300 font-mono leading-relaxed">
{`import express from 'express';
const app = express();

// 1x1 transparentní GIF v base64
const PIXEL_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

app.get('/t/open/:tracking_id', async (req, res) => {
    const trackingId = req.params.tracking_id;
    
    try {
        // Zaznamenáme otevření pouze pokud ještě nebylo zaznamenáno
        await pool.query(\`
            UPDATE sending_logs 
            SET opened_at = NOW(), status = 'opened' 
            WHERE tracking_id = $1 AND opened_at IS NULL
        \`, [trackingId]);
    } catch (err) {
        console.error('Chyba při trackování otevření:', err);
    }

    // Vrátíme obrázek s hlavičkami zakazujícími cachování
    res.writeHead(200, {
        'Content-Type': 'image/gif',
        'Content-Length': PIXEL_GIF.length,
        'Cache-Control': 'no-store, no-cache, must-revalidate, private'
    });
    res.end(PIXEL_GIF);
});`}
            </pre>
          </div>
        </section>

        {/* 4. Bounce Management */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
              <Inbox className="w-5 h-5 text-teal-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">4. Bounce & Reply Management (IMAP)</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Rozšířený IMAP checker, který kromě odpovědí detekuje i nedoručitelné e-maily (Bounces).
          </p>
          <div className="bg-gray-900 rounded-xl p-6 overflow-x-auto shadow-lg">
            <pre className="text-sm text-teal-300 font-mono leading-relaxed">
{`// Uvnitř IMAP fetch smyčky (procházení nepřečtených zpráv)
for await (let message of client.fetch({ seen: false }, { envelope: true, source: true })) {
    const senderEmail = message.envelope.from[0].address.toLowerCase();
    const subject = (message.envelope.subject || '').toLowerCase();
    
    // 1. DETEKCE BOUNCE (Nedoručitelné)
    const isBounce = senderEmail.includes('mailer-daemon') || 
                     senderEmail.includes('postmaster') ||
                     subject.includes('undelivered') ||
                     subject.includes('delivery status notification');

    if (isBounce) {
        // Extrakce původního e-mailu z těla zprávy (zjednodušený regex)
        // V produkci se parsuje hlavička "Original-Recipient" nebo "Final-Recipient"
        const originalEmailMatch = message.source.toString().match(/To:\\s*<([^>]+)>/i);
        
        if (originalEmailMatch) {
            const bouncedEmail = originalEmailMatch[1].toLowerCase();
            
            // Označíme kontakt jako neplatný, aby už nikdy nedostal e-mail
            await pool.query(\`
                UPDATE contacts SET status = 'invalid_email' 
                WHERE email = $1 AND user_id = $2
            \`, [bouncedEmail, account.user_id]);
            
            console.log(\`[BOUNCE] Kontakt \${bouncedEmail} byl trvale vyřazen.\`);
        }
    } 
    // 2. DETEKCE ODPOVĚDI (Reply)
    else {
        const contactRes = await pool.query(\`
            SELECT id FROM contacts WHERE email = $1 AND user_id = $2
        \`, [senderEmail, account.user_id]);

        if (contactRes.rows.length > 0) {
            // Označíme kontakt jako 'replied' -> zastaví sekvenci
            await pool.query(\`UPDATE contacts SET status = 'replied' WHERE id = $1\`, [contactRes.rows[0].id]);
            console.log(\`[REPLY] Odpověď od \${senderEmail}. Kampaň zastavena.\`);
        }
    }

    // Označíme zprávu jako přečtenou
    await client.messageFlagsAdd(message.seq, ['\\\\Seen']);
}`}
            </pre>
          </div>
        </section>

        {/* 5. Daily Stats Aggregator */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <BarChart className="w-5 h-5 text-orange-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">5. Daily Stats Aggregator (Cron)</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Běží každou noc v 00:05. Spočítá statistiky za včerejší den a uloží je do tabulky pro bleskové načítání Dashboardu.
          </p>
          <div className="bg-gray-900 rounded-xl p-6 overflow-x-auto shadow-lg">
            <pre className="text-sm text-orange-300 font-mono leading-relaxed">
{`import cron from 'node-cron';

// Běží každý den v 00:05
cron.schedule('5 0 * * *', async () => {
    console.log('Spouštím agregaci denních statistik...');
    
    try {
        await pool.query(\`
            INSERT INTO daily_stats (date, campaign_id, sent_count, open_count, reply_count, bounce_count)
            SELECT 
                CURRENT_DATE - INTERVAL '1 day' as stat_date,
                campaign_id,
                COUNT(*) FILTER (WHERE status IN ('sent', 'opened', 'replied')) as sent,
                COUNT(opened_at) as opened,
                COUNT(*) FILTER (WHERE status = 'replied') as replied,
                COUNT(*) FILTER (WHERE status = 'bounced' OR status = 'failed') as bounced
            FROM sending_logs
            WHERE DATE(sent_at) = CURRENT_DATE - INTERVAL '1 day'
            GROUP BY campaign_id
            
            -- Pokud už záznam pro tento den existuje, aktualizujeme ho (Idempotence)
            ON CONFLICT (date, campaign_id) DO UPDATE SET
                sent_count = EXCLUDED.sent_count,
                open_count = EXCLUDED.open_count,
                reply_count = EXCLUDED.reply_count,
                bounce_count = EXCLUDED.bounce_count;
        \`);
        
        console.log('Statistiky úspěšně agregovány.');
    } catch (err) {
        console.error('Kritická chyba při agregaci statistik:', err);
    }
});`}
            </pre>
          </div>
        </section>

      </div>
    </div>
  );
}
