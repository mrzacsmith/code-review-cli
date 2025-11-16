const fs = require('fs').promises;
const path = require('path');
const { loadRules, loadRulesFromConfig } = require('../../src/rules');

describe('Rules System', () => {
  const testDir = path.join(__dirname, '../fixtures/rules-test');

  beforeAll(async () => {
    // Create test directory structure
    await fs.mkdir(testDir, { recursive: true });
    
    // Create single file
    await fs.writeFile(
      path.join(testDir, '.cursorrules'),
      'Rule 1: Always use const\nRule 2: No console.log'
    );

    // Create directory with multiple files
    const rulesDir = path.join(testDir, '.cursorrules-dir');
    await fs.mkdir(rulesDir, { recursive: true });
    await fs.writeFile(path.join(rulesDir, 'a.md'), 'Rule A');
    await fs.writeFile(path.join(rulesDir, 'b.md'), 'Rule B');
  });

  afterAll(async () => {
    // Clean up
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (err) {
      // Ignore
    }
  });

  test('should load rules from single file', async () => {
    const rules = await loadRules(path.join(testDir, '.cursorrules'));
    expect(rules).toContain('Rule 1');
    expect(rules).toContain('Rule 2');
  });

  test('should load rules from directory', async () => {
    const rules = await loadRules(path.join(testDir, '.cursorrules-dir'));
    expect(rules).toContain('Rule A');
    expect(rules).toContain('Rule B');
    expect(rules).toContain('a.md');
    expect(rules).toContain('b.md');
  });

  test('should return null for non-existent rules', async () => {
    const rules = await loadRules(path.join(testDir, 'nonexistent'));
    expect(rules).toBeNull();
  });

  test('should load rules from config', async () => {
    const config = { rules_file: path.join(testDir, '.cursorrules') };
    const rules = await loadRulesFromConfig(config);
    expect(rules).toBeTruthy();
  });

  test('should use default path when no rules_file in config', async () => {
    const config = {};
    // This will try to load .cursorrules from current dir
    // May or may not exist, but should not throw
    const rules = await loadRulesFromConfig(config);
    expect(rules === null || typeof rules === 'string').toBe(true);
  });
});

