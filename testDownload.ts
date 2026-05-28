import fs from 'fs';
async function downloadLogo() {
  const url = 'https://drive.google.com/uc?export=download&id=17no--1RLs1mzkG2iYfqfcvpWkpKA3c4X';
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  console.log(buffer.slice(0, 10).toString('hex'));
}
downloadLogo();
