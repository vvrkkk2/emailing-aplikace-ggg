import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import cors from 'cors';

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

    // --- 1. HEALTH CHECK ENDPOINT (Pro Render) ---
    app.get('/health', (req, res) => {
        res.status(200).json({ 
            status: 'ok', 
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            worker: 'running'
        });
    });

    // --- 2. OPEN TRACKING ENDPOINT ---
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
