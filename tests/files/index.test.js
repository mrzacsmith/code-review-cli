const fs = require('fs').promises;
const path = require('path');
const { loadFile, loadFiles, shouldSkipFile, isBinaryByExtension } = require('../../src/files');

describe('File Loading', () => {
  const testDir = path.join(__dirname, '../fixtures/files-test');

  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });
    
    // Create test files
    await fs.writeFile(path.join(testDir, 'test.js'), 'console.log("test");');
    await fs.writeFile(path.join(testDir, 'large.txt'), 'x'.repeat(11 * 1024 * 1024)); // 11MB
    await fs.writeFile(path.join(testDir, 'image.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47])); // PNG header
  });

  afterAll(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (err) {
      // Ignore
    }
  });

  test('should load valid text file', async () => {
    const result = await loadFile(path.join(testDir, 'test.js'));
    expect(result.skipped).toBe(false);
    expect(result.content).toContain('console.log');
  });

  test('should skip binary files by extension', async () => {
    const result = await loadFile(path.join(testDir, 'image.png'));
    expect(result.skipped).toBe(true);
    expect(result.reason).toContain('Binary');
  });

  test('should skip files exceeding size limit', async () => {
    const result = await loadFile(path.join(testDir, 'large.txt'));
    expect(result.skipped).toBe(true);
    expect(result.reason).toContain('exceeds');
  });

  test('should check binary by extension', () => {
    expect(isBinaryByExtension('test.png')).toBe(true);
    expect(isBinaryByExtension('test.jpg')).toBe(true);
    expect(isBinaryByExtension('test.js')).toBe(false);
    expect(isBinaryByExtension('test.txt')).toBe(false);
  });

  test('should load multiple files', async () => {
    const results = await loadFiles([
      path.join(testDir, 'test.js'),
      path.join(testDir, 'image.png'),
    ]);

    expect(results.total).toBe(2);
    expect(results.loadedCount).toBe(1);
    expect(results.skippedCount).toBe(1);
  });

  test('should return null for non-existent file', async () => {
    const result = await loadFile(path.join(testDir, 'nonexistent.js'));
    expect(result.skipped).toBe(true);
  });
});

