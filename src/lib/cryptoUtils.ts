import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
// Tajný klíč musí mít přesně 32 znaků (256 bitů)
const ENCRYPTION_KEY = process.env.AES_ENCRYPTION_KEY || '12345678901234567890123456789012';
const IV_LENGTH = 16; // Pro AES je to vždy 16

/**
 * Zašifruje text (např. heslo k SMTP) pomocí AES-256-CBC.
 * @param text Čistý text k zašifrování
 * @returns Zašifrovaný text ve formátu "iv:encryptedData"
 */
export function encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    // Vrátíme IV společně se zašifrovanými daty (oddělené dvojtečkou)
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Dešifruje text zašifrovaný funkcí encrypt().
 * @param text Zašifrovaný text ve formátu "iv:encryptedData"
 * @returns Původní čistý text
 */
export function decrypt(text: string): string {
    const textParts = text.split(':');
    const ivHex = textParts.shift();
    
    if (!ivHex) throw new Error('Neplatný formát šifrovaného textu (chybí IV)');
    
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
}
