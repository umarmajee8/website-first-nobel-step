import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logoPath = path.join(__dirname, 'components/Logo.tsx');
let logoCode = fs.readFileSync(logoPath, 'utf-8');

logoCode = logoCode.replace(/<img src="data:image\/png;base64[^"]+"/g, '<img src="https://lh3.googleusercontent.com/d/17no--1RLs1mzkG2iYfqfcvpWkpKA3c4X"');

fs.writeFileSync(logoPath, logoCode);
console.log('Fixed Logo image link.');
