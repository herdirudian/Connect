const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputPath = 'public/logotlm.png';
const iconsDir = 'public/icons';

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

async function createSquareIcon(size, outputPath) {
  const padding = Math.round(size * 0.1);
  const targetImageSize = size - (padding * 2);

  const resizedLogo = await sharp(inputPath)
    .resize(targetImageSize, targetImageSize, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    })
    .toBuffer();

  const logoMeta = await sharp(resizedLogo).metadata();
  const top = Math.round((size - logoMeta.height) / 2);
  const left = Math.round((size - logoMeta.width) / 2);

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .composite([{ input: resizedLogo, top, left }])
  .png()
  .toFile(outputPath);

  console.log('Created:', outputPath, size + 'x' + size);
}

async function generateAll() {
  await createSquareIcon(192, path.join(iconsDir, 'icon-192x192.png'));
  await createSquareIcon(512, path.join(iconsDir, 'icon-512x512.png'));
  await createSquareIcon(180, path.join(iconsDir, 'apple-touch-icon.png'));
  await createSquareIcon(512, 'public/icon.png');
  console.log('PWA icons successfully generated!');
}

generateAll().catch(err => {
  console.error(err);
  process.exit(1);
});

