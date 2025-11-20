const axios = require('axios');
const chalk = require('chalk');
const { loadConfig } = require('../config/loader');
const {
  createSpinner,
  error,
  success,
  info,
  header,
  displayCommandHeader,
} = require('../output');

/**
 * Show available Anthropic models
 */
async function showAnthropic(config) {
  const anthropicConfig = config.providers?.anthropic;

  header('Anthropic Claude Models');

  if (!anthropicConfig) {
    info('Anthropic provider not configured');
    return;
  }

  // Show configuration status
  console.log(chalk.blue('Configuration:'));
  console.log(chalk.gray(`  Status: ${anthropicConfig.enabled ? chalk.green('Enabled') : chalk.yellow('Disabled')}`));
  console.log(chalk.gray(`  API Key: ${anthropicConfig.api_key ? chalk.green('Set') : chalk.red('Not set')}`));

  if (anthropicConfig.models && anthropicConfig.models.length > 0) {
    console.log(chalk.gray(`  Configured models: ${anthropicConfig.models.join(', ')}`));
  }

  // Known Anthropic models (since they don't have a public list endpoint)
  console.log(chalk.blue('\nAvailable Models:'));

  const models = [
    { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', description: 'Latest Sonnet model (recommended)', tier: 'Current' },
    { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', description: 'Fast and efficient model', tier: 'Current' },
    { id: 'claude-opus-4-1', name: 'Claude Opus 4.1', description: 'Most powerful model', tier: 'Current' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Previous generation Opus', tier: 'Legacy' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Previous generation Haiku', tier: 'Legacy' },
  ];

  const configuredModels = anthropicConfig.models || [];

  models.forEach(model => {
    const isConfigured = configuredModels.includes(model.id);
    const marker = isConfigured ? chalk.green('✓') : chalk.gray(' ');
    const tierColor = model.tier === 'Current' ? chalk.cyan : chalk.gray;

    console.log(`  ${marker} ${chalk.white(model.id)}`);
    console.log(`    ${chalk.gray(model.description)} ${tierColor(`[${model.tier}]`)}`);
  });

  console.log(chalk.blue('\n💡 Tips:'));
  console.log(chalk.gray('  • Configure models in .code-review.config or ~/.code-review-cli/config.yaml'));
  console.log(chalk.gray('  • Use "claude-sonnet-4-5" for best balance of performance and cost'));
  console.log(chalk.gray('  • Run "crc doctor anthropic" to test connectivity\n'));
}

/**
 * Show available OpenAI models
 */
async function showOpenAI(config) {
  const openaiConfig = config.providers?.openai;

  header('OpenAI Models');

  if (!openaiConfig) {
    info('OpenAI provider not configured');
    return;
  }

  // Show configuration status
  console.log(chalk.blue('Configuration:'));
  console.log(chalk.gray(`  Status: ${openaiConfig.enabled ? chalk.green('Enabled') : chalk.yellow('Disabled')}`));
  console.log(chalk.gray(`  API Key: ${openaiConfig.api_key ? chalk.green('Set') : chalk.red('Not set')}`));

  if (openaiConfig.models && openaiConfig.models.length > 0) {
    console.log(chalk.gray(`  Configured models: ${openaiConfig.models.join(', ')}`));
  }

  const spinner = createSpinner('Fetching available models from OpenAI...');

  try {
    // Resolve API key
    let resolvedApiKey = openaiConfig.api_key;
    if (!resolvedApiKey || resolvedApiKey.startsWith('env:')) {
      const envVar = resolvedApiKey?.replace('env:', '') || 'OPENAI_API_KEY';
      resolvedApiKey = process.env[envVar];

      if (!resolvedApiKey) {
        spinner.stop();
        error(`API key not found. Set ${envVar} environment variable`);
        return;
      }
    }

    const { OpenAI } = require('openai');
    const client = new OpenAI({
      apiKey: resolvedApiKey,
      timeout: 10000,
    });

    const modelsResponse = await client.models.list();
    const availableModels = modelsResponse.data
      .map(m => m.id)
      .filter(id => id.startsWith('gpt-') || id.startsWith('o1-'))
      .sort();

    spinner.stop();

    console.log(chalk.blue('\nAvailable Models:'));

    const configuredModels = openaiConfig.models || [];

    // Group models by family
    const gpt4oModels = availableModels.filter(m => m.includes('gpt-4o'));
    const gpt4Models = availableModels.filter(m => m.includes('gpt-4') && !m.includes('gpt-4o'));
    const gpt35Models = availableModels.filter(m => m.includes('gpt-3.5'));
    const o1Models = availableModels.filter(m => m.startsWith('o1-'));
    const otherModels = availableModels.filter(m =>
      !gpt4oModels.includes(m) &&
      !gpt4Models.includes(m) &&
      !gpt35Models.includes(m) &&
      !o1Models.includes(m)
    );

    const displayGroup = (title, models) => {
      if (models.length === 0) return;
      console.log(chalk.cyan(`\n  ${title}:`));
      models.forEach(model => {
        const isConfigured = configuredModels.includes(model);
        const marker = isConfigured ? chalk.green('✓') : chalk.gray(' ');
        console.log(`    ${marker} ${chalk.white(model)}`);
      });
    };

    displayGroup('GPT-4o Family (Recommended)', gpt4oModels);
    displayGroup('o1 Family (Reasoning)', o1Models);
    displayGroup('GPT-4 Family', gpt4Models);
    displayGroup('GPT-3.5 Family', gpt35Models);
    displayGroup('Other Models', otherModels);

    console.log(chalk.blue(`\n💡 Total models available: ${availableModels.length}`));
    console.log(chalk.gray('  • ✓ indicates models currently configured'));
    console.log(chalk.gray('  • Use "gpt-4o-mini" for best balance of performance and cost'));
    console.log(chalk.gray('  • Run "crc doctor openai" to test connectivity\n'));

  } catch (err) {
    spinner.stop();
    error(`Failed to fetch models: ${err.message}`);
  }
}

/**
 * Show available OpenRouter models
 */
async function showOpenRouter(config) {
  const openrouterConfig = config.providers?.openrouter;

  header('OpenRouter Models');

  if (!openrouterConfig) {
    info('OpenRouter provider not configured');
    return;
  }

  // Show configuration status
  console.log(chalk.blue('Configuration:'));
  console.log(chalk.gray(`  Status: ${openrouterConfig.enabled ? chalk.green('Enabled') : chalk.yellow('Disabled')}`));
  console.log(chalk.gray(`  API Key: ${openrouterConfig.api_key ? chalk.green('Set') : chalk.red('Not set')}`));

  if (openrouterConfig.models && openrouterConfig.models.length > 0) {
    console.log(chalk.gray(`  Configured models: ${openrouterConfig.models.join(', ')}`));
  }

  const spinner = createSpinner('Fetching available models from OpenRouter...');

  try {
    // Resolve API key
    let resolvedApiKey = openrouterConfig.api_key;
    if (!resolvedApiKey || resolvedApiKey.startsWith('env:')) {
      const envVar = resolvedApiKey?.replace('env:', '') || 'OPENROUTER_API_KEY';
      resolvedApiKey = process.env[envVar];

      if (!resolvedApiKey) {
        spinner.stop();
        error(`API key not found. Set ${envVar} environment variable`);
        return;
      }
    }

    const modelsResponse = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${resolvedApiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    const models = modelsResponse.data.data;
    spinner.stop();

    console.log(chalk.blue('\nAvailable Models:'));
    console.log(chalk.gray(`  Total: ${models.length} models\n`));

    const configuredModels = openrouterConfig.models || [];

    // Group by provider
    const modelsByProvider = {};
    models.forEach(model => {
      const provider = model.id.split('/')[0];
      if (!modelsByProvider[provider]) {
        modelsByProvider[provider] = [];
      }
      modelsByProvider[provider].push(model);
    });

    // Show popular providers
    const popularProviders = ['anthropic', 'openai', 'google', 'meta-llama', 'mistralai'];

    popularProviders.forEach(provider => {
      if (modelsByProvider[provider]) {
        console.log(chalk.cyan(`  ${provider}:`));
        modelsByProvider[provider].slice(0, 5).forEach(model => {
          const isConfigured = configuredModels.includes(model.id);
          const marker = isConfigured ? chalk.green('✓') : chalk.gray(' ');
          console.log(`    ${marker} ${chalk.white(model.id)}`);
          if (model.name !== model.id) {
            console.log(chalk.gray(`       ${model.name}`));
          }
        });
        if (modelsByProvider[provider].length > 5) {
          console.log(chalk.gray(`       ... and ${modelsByProvider[provider].length - 5} more`));
        }
        console.log();
      }
    });

    console.log(chalk.blue('💡 Tips:'));
    console.log(chalk.gray('  • ✓ indicates models currently configured'));
    console.log(chalk.gray('  • Use "anthropic/claude-sonnet-4" for Claude via OpenRouter'));
    console.log(chalk.gray(`  • Visit https://openrouter.ai/models for full list`));
    console.log(chalk.gray('  • Run "crc doctor openrouter" to test connectivity\n'));

  } catch (err) {
    spinner.stop();
    if (err.response?.status === 401) {
      error('Invalid API key. Check your OpenRouter API key.');
    } else {
      error(`Failed to fetch models: ${err.message}`);
    }
  }
}

/**
 * Show installed Ollama models
 */
async function showOllama(config) {
  const ollamaConfig = config.providers?.ollama;

  header('Ollama Models');

  if (!ollamaConfig) {
    info('Ollama provider not configured');
    return;
  }

  // Show configuration status
  const baseUrl = ollamaConfig.base_url || 'http://localhost:11434';
  console.log(chalk.blue('Configuration:'));
  console.log(chalk.gray(`  Status: ${ollamaConfig.enabled ? chalk.green('Enabled') : chalk.yellow('Disabled')}`));
  console.log(chalk.gray(`  Base URL: ${baseUrl}`));

  if (ollamaConfig.models && ollamaConfig.models.length > 0) {
    console.log(chalk.gray(`  Configured models: ${ollamaConfig.models.join(', ')}`));
  }

  const spinner = createSpinner('Checking Ollama status...');

  try {
    const tagsResponse = await axios.get(`${baseUrl}/api/tags`, {
      timeout: 5000,
    });

    spinner.stop();

    const models = tagsResponse.data.models || [];
    const installedModels = models.map(m => m.name);
    const configuredModels = ollamaConfig.models || [];

    if (installedModels.length === 0) {
      info('No models installed');
      console.log(chalk.yellow('\n💡 Install models with:'));
      console.log(chalk.gray('  ollama pull codellama:7b'));
      console.log(chalk.gray('  ollama pull deepseek-coder:latest\n'));
      return;
    }

    console.log(chalk.blue(`\nInstalled Models (${installedModels.length}):\n`));

    models.forEach(model => {
      const isConfigured = configuredModels.some(configured =>
        configured === model.name ||
        configured.startsWith(model.name.split(':')[0])
      );
      const marker = isConfigured ? chalk.green('✓') : chalk.gray(' ');

      console.log(`  ${marker} ${chalk.white(model.name)}`);

      // Show model details
      if (model.size) {
        const sizeGB = (model.size / (1024 * 1024 * 1024)).toFixed(2);
        console.log(chalk.gray(`     Size: ${sizeGB} GB`));
      }
      if (model.modified_at) {
        const modified = new Date(model.modified_at).toLocaleDateString();
        console.log(chalk.gray(`     Modified: ${modified}`));
      }
    });

    // Check for missing configured models
    const missingModels = configuredModels.filter(configured => {
      return !installedModels.some(installed =>
        installed === configured ||
        installed.startsWith(`${configured}:`) ||
        configured.startsWith(`${installed}:`)
      );
    });

    if (missingModels.length > 0) {
      console.log(chalk.yellow('\n⚠️  Missing Configured Models:'));
      missingModels.forEach(model => {
        console.log(chalk.red(`  ✗ ${model}`));
      });
      console.log(chalk.yellow('\nTo install missing models:'));
      missingModels.forEach(model => {
        console.log(chalk.gray(`  ollama pull ${model}`));
      });
    }

    console.log(chalk.blue('\n💡 Tips:'));
    console.log(chalk.gray('  • ✓ indicates models currently configured in your config'));
    console.log(chalk.gray('  • Use "ollama pull <model>" to install new models'));
    console.log(chalk.gray('  • Use "ollama list" to see all installed models'));
    console.log(chalk.gray('  • Run "crc doctor ollama" for detailed model information\n'));

  } catch (err) {
    spinner.stop();
    if (err.code === 'ECONNREFUSED' || err.message.includes('ECONNREFUSED')) {
      error('Cannot connect to Ollama. Make sure Ollama is running (ollama serve)');
    } else {
      error(`Failed to fetch models: ${err.message}`);
    }
  }
}

/**
 * Main show command handler
 */
async function showCommand(provider) {
  displayCommandHeader({ action: `Show Models (${provider})` });

  const spinner = createSpinner('Loading configuration...');

  try {
    const config = await loadConfig();
    spinner.stop();

    switch (provider) {
      case 'anthropic':
        await showAnthropic(config);
        break;
      case 'openai':
        await showOpenAI(config);
        break;
      case 'openrouter':
        await showOpenRouter(config);
        break;
      case 'ollama':
        await showOllama(config);
        break;
      default:
        spinner.stop();
        error(`Unknown provider: ${provider}`);
        console.log(chalk.gray('\nAvailable providers: anthropic, openai, openrouter, ollama'));
        console.log(chalk.gray('\nExamples:'));
        console.log(chalk.gray('  crc show anthropic'));
        console.log(chalk.gray('  crc show openai'));
        console.log(chalk.gray('  crc show openrouter'));
        console.log(chalk.gray('  crc show ollama\n'));
        process.exit(1);
    }
  } catch (err) {
    spinner.stop();
    error(`Failed to show models: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { showCommand };
