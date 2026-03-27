import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
// import { sendEmailWithRotation } from './mailer'; // V produkci by se importovalo odtud

dotenv.config();

export let emailWorker: Worker | null = null;

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
    console.warn('⚠️ REDIS_URL není nastaveno. BullMQ Worker se nespustí (vhodné pro lokální vývoj bez Redis).');
} else {
    // 1. Připojení k Redis (Upstash)
    // Upstash vyžaduje TLS (rejectUnauthorized: false)
    const connection = new IORedis(redisUrl, {
        tls: redisUrl.includes('upstash') ? { rejectUnauthorized: false } : undefined,
        maxRetriesPerRequest: null
    });

    connection.on('connect', () => {
        console.log('✅ Připojeno k Redis (Upstash).');
    });

    connection.on('error', (err) => {
        console.error('❌ Chyba připojení k Redis:', err);
    });

    // 2. Definice BullMQ Workeru
    emailWorker = new Worker('email-sending', async job => {
        const { contactId, campaignId, minDelay, maxDelay } = job.data;
        
        console.log(`[Worker] Zpracovávám úlohu ${job.id} pro kontakt ${contactId} v kampani ${campaignId}`);

        // JITTER: Náhodná prodleva mezi minDelay a maxDelay (např. 120 - 300 sekund)
        const delaySeconds = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
        console.log(`[Worker] Čekám ${delaySeconds} sekund před odesláním (Jitter)...`);
        
        // Simulace čekání
        await new Promise(resolve => setTimeout(resolve, 1000)); // V produkci: delaySeconds * 1000

        // V produkci by se zde zavolala funkce sendEmailWithRotation(campaignId, contact)
        // await sendEmailWithRotation(campaignId, contactId);

        return { success: true, message: 'E-mail odeslán' };

    }, { 
        connection, 
        concurrency: 5 // Zpracovává max 5 e-mailů paralelně
    });

    // 3. Event Listenery pro logování
    emailWorker.on('completed', job => {
        console.log(`✅ [Worker] Úloha ${job.id} úspěšně dokončena.`);
    });

    emailWorker.on('failed', (job, err) => {
        console.error(`❌ [Worker] Úloha ${job?.id} selhala: ${err.message}`);
    });

    console.log('🚀 BullMQ Worker inicializován a naslouchá frontě "email-sending".');
}
