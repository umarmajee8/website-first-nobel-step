import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  const url = 'https://lh3.googleusercontent.com/d/1xVMY-y5IXHSBSQF6l3EkKaSKKWTNFNMA';
  console.log(`Downloading original logo from ${url}...`);
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString('base64');
  console.log(`Base64 ready, starts with: data:image/png;base64,${base64.substring(0, 50)}...`);
  
  // Update index.html
  const indexPath = path.join(__dirname, 'index.html');
  let indexHtml = fs.readFileSync(indexPath, 'utf-8');
  // Revert previous bad base64 replacement
  indexHtml = indexHtml.replace(/data:image\/png;base64,PCFkb2[^"]+/g, `data:image/png;base64,${base64}`);
  fs.writeFileSync(indexPath, indexHtml);
  
  // Update Logo.tsx
  const logoPath = path.join(__dirname, 'components', 'Logo.tsx');
  let logoTsx = fs.readFileSync(logoPath, 'utf-8');
  logoTsx = logoTsx.replace(/data:image\/png;base64,PCFkb2[^"]+/g, `data:image/png;base64,${base64}`);
  fs.writeFileSync(logoPath, logoTsx);
  
  console.log('Replaced URLs with correct original base64 data URIs.');
}

run();
