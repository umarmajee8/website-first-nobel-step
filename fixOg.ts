import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.join(__dirname, 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf-8');

indexHtml = indexHtml.replace(/<meta property="og:image"[^>]+>/g, '<meta property="og:image" content="https://lh3.googleusercontent.com/d/17no--1RLs1mzkG2iYfqfcvpWkpKA3c4X" />');
indexHtml = indexHtml.replace(/<img src="data:image\/png;base64[^"]+"/g, '<img src="https://lh3.googleusercontent.com/d/17no--1RLs1mzkG2iYfqfcvpWkpKA3c4X"');
fs.writeFileSync(indexPath, indexHtml);
console.log('Fixed og:image link.');
