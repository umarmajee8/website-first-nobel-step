import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function downloadLogo() {
  const url = 'https://lh3.googleusercontent.com/d/17no--1RLs1mzkG2iYfqfcvpWkpKA3c4X';
  const outputPath = path.join(__dirname, 'public', 'logo_main.png');

  console.log(`Downloading logo from ${url}...`);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(outputPath, buffer);
    console.log(`Logo downloaded successfully and saved to ${outputPath}`);
  } catch (error) {
    console.error('Error downloading logo:', error);
  }
}

downloadLogo();
