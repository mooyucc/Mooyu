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
    // 为所有图片资源添加指纹，包括 favicon / PWA 图标等
    {
      dir: 'images',
      extensions: [
        '.png',
        '.jpg',
        '.jpeg',
        '.gif',
        '.svg',
        '.webp',
        '.ico'
      ]
    },
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
    // 先拷贝目录内容，再在 dist 里进行重命名
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

  // 处理根目录下需要指纹化的单文件资源（例如 favicon.ico）
  const rootFilesToFingerprint = ['favicon.ico'];
  for (const fileName of rootFilesToFingerprint) {
    const sourcePath = path.join(rootDir, fileName);
    try {
      const stats = await fsp.stat(sourcePath);
      if (!stats.isFile()) {
        continue;
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        continue;
      }
      throw error;
    }

    const distSourcePath = path.join(distDir, fileName);
    await ensureDir(path.dirname(distSourcePath));
    await fsp.copyFile(sourcePath, distSourcePath);

    const content = await fsp.readFile(sourcePath);
    const extension = path.extname(fileName);
    const baseName = path.basename(fileName, extension);
    const hash = crypto
      .createHash('sha256')
      .update(content)
      .digest('hex')
      .slice(0, 8);
    const hashedFileName = `${baseName}.${hash}${extension}`;
    const hashedDistPath = path.join(distDir, hashedFileName);
    await fsp.rename(distSourcePath, hashedDistPath);

    const originalRelPath = fileName.replace(/\\/g, '/');
    const hashedRelPath = hashedFileName.replace(/\\/g, '/');
    replacements.set(originalRelPath, hashedRelPath);
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

      // 兼容 PWA manifest 中不带目录前缀的图标路径，例如 "/web-app-manifest-192x192.png"
      if (original.startsWith('images/')) {
        const fileOnly = path.basename(original);
        variants.push(fileOnly, `./${fileOnly}`, `/${fileOnly}`);
      }

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

// 处理额外的文本文件，例如 PWA manifest（images/site.webmanifest）
async function processExtraTextFiles(replacements) {
  const extraFiles = [
    path.join('images', 'site.webmanifest'),
  ];

  for (const relPath of extraFiles) {
    const sourcePath = path.join(rootDir, relPath);
    let content;
    try {
      content = await fsp.readFile(sourcePath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        continue;
      }
      throw error;
    }

    for (const [original, hashed] of replacements) {
      const variants = [
        original,
        `./${original}`,
        `/${original}`,
      ];

      if (original.startsWith('images/')) {
        const fileOnly = path.basename(original);
        variants.push(fileOnly, `./${fileOnly}`, `/${fileOnly}`);
      }

      for (const variant of variants) {
        let replacement;
        // 对类似 "/web-app-manifest-192x192.png" 这种只写文件名的情况，
        // 将其替换为带 images 目录和哈希的路径，例如 "/images/web-app-manifest-192x192.<hash>.png"
        if (original.startsWith('images/')) {
          const fileOnly = path.basename(original);
          const hashedFileOnly = path.basename(hashed);
          if (
            variant === fileOnly ||
            variant === `./${fileOnly}` ||
            variant === `/${fileOnly}`
          ) {
            // 保留 variant 的前缀（可能是 ""、"./" 或 "/"），但文件名换成带哈希的，并补上 images 目录
            const prefix = variant.startsWith('/')
              ? '/'
              : variant.startsWith('./')
              ? './'
              : '';
            replacement = `${prefix}images/${hashedFileOnly}`;
          } else {
            replacement = variant.replace(original, hashed);
          }
        } else {
          replacement = variant.replace(original, hashed);
        }

        const pattern = new RegExp(escapeRegExp(variant), 'g');
        content = content.replace(pattern, replacement);
      }
    }

    const destinationPath = path.join(distDir, relPath);
    await ensureDir(path.dirname(destinationPath));
    await fsp.writeFile(destinationPath, content, 'utf8');
  }
}

async function copyStaticAssets() {
  // 非指纹化的静态目录（例如纯下载文件），保持原样复制
  const directories = ['download'];
  for (const dir of directories) {
    await copyDirectory(dir);
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

  console.log('Processing extra text files (e.g. manifest)...');
  await processExtraTextFiles(replacements);

  console.log('Build completed. Output directory:', distDir);
}

build().catch((error) => {
  console.error('Build failed:', error);
  process.exitCode = 1;
});

