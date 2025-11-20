const { OllamaProvider } = require('./ollama');
const { OpenAIProvider } = require('./openai');
const { OpenRouterProvider } = require('./openrouter');
const { AnthropicProvider } = require('./anthropic');

/**
 * Create provider instance from config
 */
function createProvider(providerConfig) {
  const { name, ...config } = providerConfig;

  switch (name) {
    case 'ollama':
      return new OllamaProvider({ name, ...config });
    case 'openai':
      return new OpenAIProvider({ name, ...config });
    case 'openrouter':
      return new OpenRouterProvider({ name, ...config });
    case 'anthropic':
      return new AnthropicProvider({ name, ...config });
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}

/**
 * Create all enabled providers from config
 */
function createProviders(config) {
  const providers = [];
  const providerConfigs = config.providers || {};

  for (const [name, providerConfig] of Object.entries(providerConfigs)) {
    if (providerConfig && providerConfig.enabled) {
      try {
        const provider = createProvider({
          name,
          ...providerConfig,
        });
        providers.push(provider);
      } catch (err) {
        console.warn(`Failed to create provider ${name}: ${err.message}`);
      }
    }
  }

  return providers;
}

module.exports = {
  createProvider,
  createProviders,
  OllamaProvider,
  OpenAIProvider,
  OpenRouterProvider,
  AnthropicProvider,
};

