import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.join(__dirname, 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf-8');

indexHtml = indexHtml.replace(/<link rel="icon"[^>]+>/g, '<link rel="icon" type="image/png" href="https://lh3.googleusercontent.com/d/17no--1RLs1mzkG2iYfqfcvpWkpKA3c4X" />');
indexHtml = indexHtml.replace(/<link rel="shortcut icon"[^>]+>/g, '<link rel="shortcut icon" href="https://lh3.googleusercontent.com/d/17no--1RLs1mzkG2iYfqfcvpWkpKA3c4X" type="image/png" />');
indexHtml = indexHtml.replace(/<link rel="apple-touch-icon"[^>]+>/g, '<link rel="apple-touch-icon" href="https://lh3.googleusercontent.com/d/17no--1RLs1mzkG2iYfqfcvpWkpKA3c4X" />');

fs.writeFileSync(indexPath, indexHtml);
console.log('Fixed favicon links.');
