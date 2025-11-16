const fs = require('fs').promises;
const path = require('path');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Common binary file extensions
const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.ico',
  '.pdf',
  '.zip',
  '.tar',
  '.gz',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.mp4',
  '.mp3',
  '.avi',
  '.mov',
  '.webm',
  '.bin',
]);

/**
 * Check if file is binary by extension
 */
function isBinaryByExtension(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

/**
 * Check if file is binary by content (check for null bytes)
 */
async function isBinaryByContent(filePath) {
  try {
    const buffer = Buffer.alloc(512);
    const fd = await fs.open(filePath, 'r');
    const { bytesRead } = await fd.read(buffer, 0, 512, 0);
    await fd.close();

    // Check for null bytes in first 512 bytes
    return buffer.slice(0, bytesRead).includes(0);
  } catch {
    return false;
  }
}

/**
 * Check if file should be skipped
 */
async function shouldSkipFile(filePath) {
  // Check file size
  try {
    const stat = await fs.stat(filePath);
    if (stat.size > MAX_FILE_SIZE) {
      return { skip: true, reason: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` };
    }
  } catch (err) {
    return { skip: true, reason: `Cannot access file: ${err.message}` };
  }

  // Check if binary by extension
  if (isBinaryByExtension(filePath)) {
    return { skip: true, reason: 'Binary file (by extension)' };
  }

  // Check if binary by content
  if (await isBinaryByContent(filePath)) {
    return { skip: true, reason: 'Binary file (by content)' };
  }

  return { skip: false };
}

/**
 * Load file content with size and binary checks
 */
async function loadFile(filePath) {
  const resolvedPath = path.resolve(filePath);

  const skipCheck = await shouldSkipFile(resolvedPath);
  if (skipCheck.skip) {
    return {
      path: filePath,
      content: null,
      skipped: true,
      reason: skipCheck.reason,
    };
  }

  try {
    const content = await fs.readFile(resolvedPath, 'utf8');
    return {
      path: filePath,
      content,
      skipped: false,
      size: content.length,
    };
  } catch (err) {
    return {
      path: filePath,
      content: null,
      skipped: true,
      reason: `Error reading file: ${err.message}`,
    };
  }
}

/**
 * Load multiple files
 */
async function loadFiles(filePaths) {
  const results = await Promise.all(filePaths.map((fp) => loadFile(fp)));

  const loaded = results.filter((r) => !r.skipped);
  const skipped = results.filter((r) => r.skipped);

  return {
    files: loaded,
    skipped,
    total: results.length,
    loadedCount: loaded.length,
    skippedCount: skipped.length,
  };
}

/**
 * Get file stats
 */
async function getFileStats(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return {
      size: stat.size,
      modified: stat.mtime,
    };
  } catch {
    return null;
  }
}

module.exports = {
  loadFile,
  loadFiles,
  getFileStats,
  shouldSkipFile,
  isBinaryByExtension,
  MAX_FILE_SIZE,
};

