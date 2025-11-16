const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const { configSchema } = require('./schema');

/**
 * Resolve environment variable references in config
 * Supports format: env:VARIABLE_NAME
 */
function resolveEnvVars(obj) {
  if (typeof obj === 'string' && obj.startsWith('env:')) {
    const envVar = obj.substring(4);
    const value = process.env[envVar];
    if (!value) {
      throw new Error(`Environment variable ${envVar} is not set`);
    }
    return value;
  }

  if (Array.isArray(obj)) {
    return obj.map(resolveEnvVars);
  }

  if (obj && typeof obj === 'object') {
    const resolved = {};
    for (const [key, value] of Object.entries(obj)) {
      resolved[key] = resolveEnvVars(value);
    }
    return resolved;
  }

  return obj;
}

/**
 * Load and validate configuration file
 */
async function loadConfig(configPath = '.code-review.config') {
  try {
    const fullPath = path.resolve(configPath);
    const content = await fs.readFile(fullPath, 'utf8');
    const rawConfig = yaml.load(content);

    // Resolve environment variables
    const config = resolveEnvVars(rawConfig);

    // Validate schema
    const { error, value } = configSchema.validate(config, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((d) => d.message).join(', ');
      throw new Error(`Invalid configuration: ${details}`);
    }

    return value;
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`Configuration file not found: ${configPath}`);
    }
    throw err;
  }
}

/**
 * Get enabled providers from config
 */
function getEnabledProviders(config) {
  const enabled = [];
  const providers = config.providers || {};

  for (const [name, providerConfig] of Object.entries(providers)) {
    if (providerConfig && providerConfig.enabled) {
      enabled.push({
        name,
        ...providerConfig,
      });
    }
  }

  return enabled;
}

module.exports = {
  loadConfig,
  getEnabledProviders,
  resolveEnvVars,
};

