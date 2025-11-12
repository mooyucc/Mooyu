#!/usr/bin/env node

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const rootDir = path.resolve(__dirname);
const distDir = path.join(rootDir, 'dist');

async function ensureDir(dirPath) {
  await fsp.mkdir(dirPath, { recursive: true });
}

async function cleanDist() {
  await fsp.rm(distDir, { recursive: true, force: true });
  await ensureDir(distDir);
}

async function copyDirectory(relPath) {
  const source = path.join(rootDir, relPath);
  try {
    const stats = await fsp.stat(source);
    if (!stats.isDirectory()) {
      return;
    }
    const destination = path.join(distDir, relPath);
    await ensureDir(path.dirname(destination));
    await fsp.cp(source, destination, { recursive: true });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function copyFile(relPath) {
  const source = path.join(rootDir, relPath);
  try {
    const stats = await fsp.stat(source);
    if (!stats.isFile()) {
      return;
    }
    const destination = path.join(distDir, relPath);
    await ensureDir(path.dirname(destination));
    await fsp.copyFile(source, destination);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function fingerprintAssets() {
  const replacements = new Map();
  const assetDefinitions = [
    { dir: 'css', extensions: ['.css'] },
    { dir: 'js', extensions: ['.js'] },
  ];

  for (const assetDef of assetDefinitions) {
    const sourceDir = path.join(rootDir, assetDef.dir);
    let entries;
    try {
      entries = await fsp.readdir(sourceDir);
    } catch (error) {
      if (error.code === 'ENOENT') {
        continue;
      }
      throw error;
    }

    if (!entries.length) {
      continue;
    }

    const distAssetDir = path.join(distDir, assetDef.dir);
    await ensureDir(distAssetDir);
    // Copy directory contents first
    await fsp.cp(sourceDir, distAssetDir, { recursive: true });

    for (const entry of entries) {
      const extension = path.extname(entry);
      if (!assetDef.extensions.includes(extension)) {
        continue;
      }
      const originalRelPath = path.join(assetDef.dir, entry).replace(/\\/g, '/');
      const sourceFilePath = path.join(sourceDir, entry);
      const distFilePath = path.join(distAssetDir, entry);
      const content = await fsp.readFile(sourceFilePath);
      const hash = crypto.createHash('sha256').update(content).digest('hex').slice(0, 8);
      const baseName = path.basename(entry, extension);
      const hashedFileName = `${baseName}.${hash}${extension}`;
      const hashedRelPath = path.join(assetDef.dir, hashedFileName).replace(/\\/g, '/');
      const hashedDistPath = path.join(distAssetDir, hashedFileName);
      await fsp.rename(distFilePath, hashedDistPath);
      replacements.set(originalRelPath, hashedRelPath);
    }
  }

  return replacements;
}

async function processHtmlFiles(replacements) {
  const entries = await fsp.readdir(rootDir);
  const htmlFiles = entries.filter((name) => name.endsWith('.html'));

  for (const fileName of htmlFiles) {
    const sourcePath = path.join(rootDir, fileName);
    const destinationPath = path.join(distDir, fileName);
    let content = await fsp.readFile(sourcePath, 'utf8');

    for (const [original, hashed] of replacements) {
      const variants = [
        original,
        `./${original}`,
        `/${original}`,
      ];
      for (const variant of variants) {
        const replacement = variant.replace(original, hashed);
        const pattern = new RegExp(escapeRegExp(variant), 'g');
        content = content.replace(pattern, replacement);
      }
    }

    await ensureDir(path.dirname(destinationPath));
    await fsp.writeFile(destinationPath, content, 'utf8');
  }
}

async function copyStaticAssets() {
  const directories = ['images', 'download'];
  for (const dir of directories) {
    await copyDirectory(dir);
  }

  const files = ['favicon.ico'];
  for (const file of files) {
    await copyFile(file);
  }
}

async function build() {
  console.log('Cleaning dist directory...');
  await cleanDist();

  console.log('Copying static assets...');
  await copyStaticAssets();

  console.log('Fingerprinting CSS/JS assets...');
  const replacements = await fingerprintAssets();

  console.log('Processing HTML files...');
  await processHtmlFiles(replacements);

  console.log('Build completed. Output directory:', distDir);
}

build().catch((error) => {
  console.error('Build failed:', error);
  process.exitCode = 1;
});

