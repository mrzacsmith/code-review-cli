const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');
const { configSchema } = require('./schema');

/**
 * Resolve environment variable references in config
 * Supports format: env:VARIABLE_NAME
 * Only resolves for enabled providers (skips disabled ones)
 */
function resolveEnvVars(obj, skipDisabled = false) {
  if (typeof obj === 'string' && obj.startsWith('env:')) {
    const envVar = obj.substring(4);
    const value = process.env[envVar];
    if (!value) {
      // If we're skipping disabled providers, return the env: reference as-is
      if (skipDisabled) {
        return obj;
      }
      throw new Error(`Environment variable ${envVar} is not set`);
    }
    return value;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => resolveEnvVars(item, skipDisabled));
  }

  if (obj && typeof obj === 'object') {
    const resolved = {};
    for (const [key, value] of Object.entries(obj)) {
      // For providers, check if enabled before resolving env vars
      if (key === 'providers' && typeof value === 'object') {
        resolved[key] = {};
        for (const [providerName, providerConfig] of Object.entries(value)) {
          // Only resolve env vars if provider is enabled
          if (providerConfig && providerConfig.enabled) {
            resolved[key][providerName] = resolveEnvVars(providerConfig, false);
          } else {
            // Skip disabled providers - don't resolve their env vars
            resolved[key][providerName] = providerConfig;
          }
        }
      } else {
        resolved[key] = resolveEnvVars(value, skipDisabled);
      }
    }
    return resolved;
  }

  return obj;
}

/**
 * Get global config file path
 */
function getGlobalConfigPath() {
  const homeDir = os.homedir();
  return path.join(homeDir, '.code-review-cli', 'config.yaml');
}

/**
 * Load global config (if exists)
 */
async function loadGlobalConfig() {
  const globalPath = getGlobalConfigPath();
  try {
    const content = await fs.readFile(globalPath, 'utf8');
    const rawConfig = yaml.load(content);
    // Don't resolve env vars in global config - allow direct API keys
    return rawConfig;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return null; // Global config is optional
    }
    throw err;
  }
}

/**
 * Deep merge two objects (project config overrides global)
 * Special handling: if project has env: reference but global has actual key, use global's key
 */
function mergeConfigs(global, project) {
  if (!global) return project;
  if (!project) return global;

  const merged = { ...global };

  // Merge providers
  if (project.providers) {
    merged.providers = { ...global.providers };
    // For each provider, merge settings (project overrides global)
    for (const [name, providerConfig] of Object.entries(project.providers)) {
      const globalProvider = global.providers?.[name] || {};
      const mergedProvider = { ...globalProvider, ...providerConfig };
      
      // Special case: if project has env: reference but global has actual api_key, use global's key
      // This allows project configs to use env: references while global config provides the actual key
      if (
        providerConfig.api_key &&
        providerConfig.api_key.startsWith('env:') &&
        globalProvider.api_key &&
        !globalProvider.api_key.startsWith('env:')
      ) {
        mergedProvider.api_key = globalProvider.api_key;
      }
      
      merged.providers[name] = mergedProvider;
    }
  }

  // Merge other top-level settings (project overrides global)
  if (project.output) {
    merged.output = { ...global.output, ...project.output };
  }
  if (project.rules_file !== undefined) {
    merged.rules_file = project.rules_file;
  }
  if (project.dependency_depth !== undefined) {
    merged.dependency_depth = project.dependency_depth;
  }

  return merged;
}

/**
 * Load and validate configuration file
 * Merges global config with project config (project takes precedence)
 */
async function loadConfig(configPath = '.code-review.config') {
  try {
    // Load global config first
    const globalConfig = await loadGlobalConfig();

    // Load project config
    const fullPath = path.resolve(configPath);
    const content = await fs.readFile(fullPath, 'utf8');
    const rawProjectConfig = yaml.load(content);

    // Merge configs (project overrides global)
    const mergedRaw = mergeConfigs(globalConfig, rawProjectConfig);

    // Resolve environment variables (only for env: references)
    const config = resolveEnvVars(mergedRaw);

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
  getGlobalConfigPath,
  loadGlobalConfig,
};

