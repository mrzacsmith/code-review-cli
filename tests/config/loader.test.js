const fs = require('fs').promises;
const path = require('path');
const { loadConfig, getEnabledProviders } = require('../../src/config/loader');

describe('Config Loader', () => {
  const testConfigPath = path.join(__dirname, '../fixtures/test-config.yaml');

  beforeAll(async () => {
    // Create test config file
    const testConfig = `providers:
  ollama:
    enabled: true
    base_url: http://localhost:11434
    models:
      - codellama
output:
  reports_dir: .code-reviews
rules_file: .cursorrules
dependency_depth: 2
`;
    await fs.mkdir(path.dirname(testConfigPath), { recursive: true });
    await fs.writeFile(testConfigPath, testConfig);
  });

  afterAll(async () => {
    // Clean up
    try {
      await fs.unlink(testConfigPath);
    } catch (err) {
      // Ignore
    }
  });

  test('should load valid config', async () => {
    const config = await loadConfig(testConfigPath);
    expect(config).toBeDefined();
    expect(config.providers.ollama.enabled).toBe(true);
  });

  test('should get enabled providers', async () => {
    const config = await loadConfig(testConfigPath);
    const enabled = getEnabledProviders(config);
    expect(enabled.length).toBe(1);
    expect(enabled[0].name).toBe('ollama');
  });

  test('should throw error for missing config file', async () => {
    await expect(loadConfig('./nonexistent.yaml')).rejects.toThrow();
  });
});

