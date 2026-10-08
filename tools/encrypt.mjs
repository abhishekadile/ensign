#!/usr/bin/env node
// Encrypts the promo so it can live in a public repo and only open with the password.
//
//   PROMO_PASSWORD='your long passphrase' node tools/encrypt.mjs path/to/promo.mp4
//
// Writes vault/promo.bin (ciphertext + auth tag) and vault/promo.json (salt, iv, type).
// Keep the original file out of the repo (promo-source/ is git ignored).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomBytes, pbkdf2Sync, createCipheriv } from 'node:crypto';
import { extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIME = {
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.m4v': 'video/mp4',
  '.html': 'text/html', '.htm': 'text/html', '.pdf': 'application/pdf',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp'
};
const ITERATIONS = 600000;

const file = process.argv[2];
const password = process.env.PROMO_PASSWORD;
if (!file || !password) {
  console.error('Usage: PROMO_PASSWORD=\'passphrase\' node tools/encrypt.mjs <promo file>');
  process.exit(1);
}
const mime = MIME[extname(file).toLowerCase()];
if (!mime) {
  console.error('Unsupported file type. Use mp4, webm, mov, html (single file), pdf, or an image.');
  process.exit(1);
}
if (password.length < 12) console.warn('Warning: use a passphrase of 12 or more characters. Short passwords can be guessed offline.');

const plain = readFileSync(file);
if (plain.length > 90 * 1024 * 1024) console.warn('Warning: GitHub blocks files over 100 MB. Compress the promo first.');

const salt = randomBytes(16);
const iv = randomBytes(12);
const key = pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');
const cipher = createCipheriv('aes-256-gcm', key, iv);
const body = Buffer.concat([cipher.update(plain), cipher.final(), cipher.getAuthTag()]); // WebCrypto expects tag appended

const out = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'vault');
mkdirSync(out, { recursive: true });
writeFileSync(resolve(out, 'promo.bin'), body);
writeFileSync(resolve(out, 'promo.json'), JSON.stringify({
  v: 1, kdf: 'PBKDF2-SHA256', iterations: ITERATIONS,
  salt: salt.toString('base64'), iv: iv.toString('base64'), mime
}, null, 2) + '\n');
console.log(`Encrypted ${(plain.length / 1048576).toFixed(1)} MB (${mime}) into vault/promo.bin`);
