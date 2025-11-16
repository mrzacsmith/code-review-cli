const axios = require('axios');
const chalk = require('chalk');
const { loadConfig, getEnabledProviders } = require('../config/loader');
const {
  createSpinner,
  error,
  success,
  info,
  warning,
  header,
  displayCommandHeader,
} = require('../output');

/**
 * Check Ollama status and list installed models
 */
async function checkOllama(config) {
  const ollamaConfig = config.providers?.ollama;
  if (!ollamaConfig || !ollamaConfig.enabled) {
    return {
      provider: 'Ollama',
      status: 'disabled',
      message: 'Ollama is not enabled in configuration',
    };
  }

  const baseUrl = ollamaConfig.base_url || 'http://localhost:11434';
  const spinner = createSpinner('Checking Ollama...');

  try {
    // Check if Ollama is running
    const tagsResponse = await axios.get(`${baseUrl}/api/tags`, {
      timeout: 5000,
    });

    spinner.stop();

    const models = tagsResponse.data.models || [];
    const installedModels = models.map((m) => m.name);
    const configuredModels = ollamaConfig.models || [];

    // Check which configured models are installed
    const missingModels = configuredModels.filter((configured) => {
      return !installedModels.some(
        (installed) =>
          installed === configured ||
          installed.startsWith(`${configured}:`) ||
          configured.startsWith(`${installed}:`)
      );
    });

    const foundModels = configuredModels.filter((configured) => {
      return installedModels.some(
        (installed) =>
          installed === configured ||
          installed.startsWith(`${configured}:`) ||
          configured.startsWith(`${installed}:`)
      );
    });

    return {
      provider: 'Ollama',
      status: 'running',
      baseUrl,
      installedModels,
      configuredModels,
      foundModels,
      missingModels,
    };
  } catch (err) {
    spinner.stop();

    if (err.code === 'ECONNREFUSED' || err.message.includes('ECONNREFUSED')) {
      return {
        provider: 'Ollama',
        status: 'not_running',
        message: 'Cannot connect to Ollama. Make sure Ollama is running (ollama serve)',
        baseUrl,
      };
    }

    return {
      provider: 'Ollama',
      status: 'error',
      message: err.message,
      baseUrl,
    };
  }
}

/**
 * Check OpenAI status
 */
async function checkOpenAI(config) {
  const openaiConfig = config.providers?.openai;
  if (!openaiConfig || !openaiConfig.enabled) {
    return {
      provider: 'OpenAI',
      status: 'disabled',
      message: 'OpenAI is not enabled in configuration',
    };
  }

  const apiKey = openaiConfig.api_key;
  if (!apiKey || apiKey.startsWith('env:')) {
    const envVar = apiKey?.replace('env:', '') || 'OPENAI_API_KEY';
    const hasKey = !!process.env[envVar];
    return {
      provider: 'OpenAI',
      status: hasKey ? 'configured' : 'missing_key',
      message: hasKey
        ? `API key found in ${envVar}`
        : `API key not found. Set ${envVar} environment variable`,
      configuredModels: openaiConfig.models || [],
    };
  }

  return {
    provider: 'OpenAI',
    status: 'configured',
    message: 'API key is set',
    configuredModels: openaiConfig.models || [],
  };
}

/**
 * Check Anthropic status
 */
async function checkAnthropic(config) {
  const anthropicConfig = config.providers?.anthropic;
  if (!anthropicConfig || !anthropicConfig.enabled) {
    return {
      provider: 'Anthropic',
      status: 'disabled',
      message: 'Anthropic is not enabled in configuration',
    };
  }

  const apiKey = anthropicConfig.api_key;
  if (!apiKey || apiKey.startsWith('env:')) {
    const envVar = apiKey?.replace('env:', '') || 'ANTHROPIC_API_KEY';
    const hasKey = !!process.env[envVar];
    return {
      provider: 'Anthropic',
      status: hasKey ? 'configured' : 'missing_key',
      message: hasKey
        ? `API key found in ${envVar}`
        : `API key not found. Set ${envVar} environment variable`,
      configuredModels: anthropicConfig.models || [],
    };
  }

  return {
    provider: 'Anthropic',
    status: 'configured',
    message: 'API key is set',
    configuredModels: anthropicConfig.models || [],
  };
}

/**
 * Check OpenRouter status
 */
async function checkOpenRouter(config) {
  const openrouterConfig = config.providers?.openrouter;
  if (!openrouterConfig || !openrouterConfig.enabled) {
    return {
      provider: 'OpenRouter',
      status: 'disabled',
      message: 'OpenRouter is not enabled in configuration',
    };
  }

  const apiKey = openrouterConfig.api_key;
  if (!apiKey || apiKey.startsWith('env:')) {
    const envVar = apiKey?.replace('env:', '') || 'OPENROUTER_API_KEY';
    const hasKey = !!process.env[envVar];
    return {
      provider: 'OpenRouter',
      status: hasKey ? 'configured' : 'missing_key',
      message: hasKey
        ? `API key found in ${envVar}`
        : `API key not found. Set ${envVar} environment variable`,
      configuredModels: openrouterConfig.models || [],
    };
  }

  return {
    provider: 'OpenRouter',
    status: 'configured',
    message: 'API key is set',
    configuredModels: openrouterConfig.models || [],
  };
}

/**
 * Display Ollama-specific doctor results
 */
function displayOllamaResults(result) {
  header('Ollama Status');

  if (result.status === 'not_running') {
    warning(`⚠️  Ollama is not running`);
    console.log(chalk.gray(`Base URL: ${result.baseUrl}`));
    console.log(chalk.yellow(`\nTo start Ollama:`));
    console.log(chalk.gray(`  ollama serve`));
    process.exit(1);
  }

  if (result.status === 'error') {
    error(`✗ Error connecting to Ollama`);
    console.log(chalk.gray(`Base URL: ${result.baseUrl}`));
    console.log(chalk.red(`Error: ${result.message}`));
    process.exit(1);
  }

  if (result.status === 'disabled') {
    info(result.message);
    process.exit(0);
  }

  if (result.status === 'running') {
    success(`✓ Ollama is running`);
    console.log(chalk.gray(`Base URL: ${result.baseUrl}\n`));

    if (result.installedModels.length === 0) {
      warning(`⚠️  No models installed`);
      console.log(chalk.yellow(`\nTo install a model:`));
      console.log(chalk.gray(`  ollama pull codellama:7b`));
      console.log(chalk.gray(`  ollama pull deepseek-coder:latest`));
      process.exit(0);
    }

    console.log(chalk.blue(`📦 Installed Models (${result.installedModels.length}):\n`));
    result.installedModels.forEach((model) => {
      console.log(chalk.green(`  ✓ ${model}`));
    });

    if (result.configuredModels.length > 0) {
      console.log(chalk.blue(`\n⚙️  Configured Models:\n`));
      result.configuredModels.forEach((model) => {
        if (result.foundModels.includes(model)) {
          console.log(chalk.green(`  ✓ ${model} (found)`));
        } else {
          console.log(chalk.red(`  ✗ ${model} (not found)`));
        }
      });

      if (result.missingModels.length > 0) {
        console.log(chalk.yellow(`\n⚠️  Missing Models:\n`));
        result.missingModels.forEach((model) => {
          console.log(chalk.red(`  ✗ ${model}`));
        });
        console.log(chalk.yellow(`\nTo install missing models:`));
        result.missingModels.forEach((model) => {
          console.log(chalk.gray(`  ollama pull ${model}`));
        });
      }
    } else {
      console.log(chalk.yellow(`\n⚠️  No models configured in .code-review.config`));
      console.log(chalk.gray(`\nAdd models to your config:`));
      console.log(chalk.gray(`  models:`));
      result.installedModels.slice(0, 3).forEach((model) => {
        console.log(chalk.gray(`    - ${model}`));
      });
    }
  }
}

/**
 * Display general doctor results
 */
function displayGeneralResults(results) {
  header('Code Review CLI Health Check');

  for (const result of results) {
    console.log(chalk.bold(`\n${result.provider}:`));

    if (result.status === 'disabled') {
      console.log(chalk.gray(`  ${result.message}`));
    } else if (result.status === 'running') {
      success(`  ✓ Running`);
      if (result.installedModels) {
        console.log(chalk.gray(`  Installed: ${result.installedModels.length} model(s)`));
      }
    } else if (result.status === 'configured') {
      success(`  ✓ ${result.message}`);
      if (result.configuredModels && result.configuredModels.length > 0) {
        console.log(chalk.gray(`  Models: ${result.configuredModels.join(', ')}`));
      }
    } else if (result.status === 'missing_key') {
      warning(`  ⚠️  ${result.message}`);
    } else if (result.status === 'not_running') {
      warning(`  ⚠️  ${result.message}`);
    } else if (result.status === 'error') {
      error(`  ✗ Error: ${result.message}`);
    }
  }

  console.log(chalk.blue(`\n💡 Tip: Use "crc doctor ollama" for detailed Ollama model information\n`));
}

/**
 * Doctor command
 */
async function doctorCommand(provider) {
  // Display command header
  const headerAction = provider ? `Doctor Check (${provider})` : 'Doctor Check';
  displayCommandHeader({ action: headerAction });
  
  const spinner = createSpinner('Loading configuration...');

  try {
    const config = await loadConfig();
    spinner.stop();

    if (provider === 'ollama') {
      const result = await checkOllama(config);
      displayOllamaResults(result);
    } else if (provider) {
      error(`Unknown provider: ${provider}`);
      console.log(chalk.gray(`Available providers: ollama, openai, anthropic, openrouter\n`));
      process.exit(1);
    } else {
      // General health check
      const results = await Promise.all([
        checkOllama(config),
        checkOpenAI(config),
        checkAnthropic(config),
        checkOpenRouter(config),
      ]);
      displayGeneralResults(results);
    }
  } catch (err) {
    spinner.stop();
    error(`Failed to run doctor: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { doctorCommand };

