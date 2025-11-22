const fs = require('fs').promises;
const yaml = require('js-yaml');
const chalk = require('chalk');
const { DEFAULT_CONFIG } = require('../config/template');
const { getGlobalConfigPath } = require('../config/loader');
const { displayCommandHeader } = require('../output');

/**
 * Parse YAML and preserve existing values
 */
function parseYaml(content) {
  try {
    return yaml.load(content);
  } catch (err) {
    throw new Error(`Failed to parse YAML: ${err.message}`);
  }
}

/**
 * Merge template comments into existing config
 * Preserves all user values, only adds missing comments and new fields
 */
function upgradeConfig(existingContent, templateContent) {
  const existing = parseYaml(existingContent);
  const template = parseYaml(templateContent);

  // We'll rebuild the config with comments by inserting them into the YAML
  const lines = existingContent.split('\n');
  const templateLines = templateContent.split('\n');
  const result = [];

  let inProviders = false;
  let currentProvider = null;
  let currentIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track when we're in providers section
    if (trimmed === 'providers:') {
      inProviders = true;
      result.push(line);
      continue;
    }

    // Track current provider
    if (inProviders && /^  \w+:/.test(line)) {
      currentProvider = trimmed.replace(':', '');
      result.push(line);
      continue;
    }

    // Exit providers section
    if (inProviders && /^\w+:/.test(line) && !line.startsWith(' ')) {
      inProviders = false;
      currentProvider = null;
    }

    result.push(line);

    // After models array in a provider, add max_tokens and temperature comments if missing
    if (inProviders && currentProvider && trimmed.startsWith('- ')) {
      // Check if this is the last model in the array
      const nextLine = lines[i + 1];
      if (!nextLine || !nextLine.trim().startsWith('- ')) {
        // This is the last model, check if max_tokens/temperature comments exist
        const hasMaxTokens = lines.slice(i + 1).some((l, idx) => {
          if (idx > 10) return true; // Stop searching after 10 lines
          return l.includes('max_tokens');
        });

        if (!hasMaxTokens) {
          // Find the template comments for this provider
          const templateProvider = templateLines.findIndex(l =>
            l.trim() === `${currentProvider}:`
          );

          if (templateProvider !== -1) {
            // Find the comment lines after models in template
            const commentsStart = templateLines.findIndex((l, idx) =>
              idx > templateProvider && l.includes('# max_tokens')
            );

            if (commentsStart !== -1) {
              // Add the comment lines
              let commentIdx = commentsStart;
              while (commentIdx < templateLines.length &&
                     templateLines[commentIdx].trim().startsWith('#')) {
                result.push(templateLines[commentIdx]);
                commentIdx++;
              }
            }
          }
        }
      }
    }
  }

  return result.join('\n');
}

/**
 * Upgrade project config
 */
async function upgradeProjectConfig() {
  const configPath = '.code-review.config';

  try {
    // Check if config exists
    try {
      await fs.access(configPath);
    } catch {
      console.log(chalk.yellow(`⚠️  No project config found: ${configPath}`));
      console.log(chalk.gray('Run `crc init` to create one.\n'));
      return false;
    }

    // Read existing config
    const existingContent = await fs.readFile(configPath, 'utf8');

    // Upgrade config
    const upgradedContent = upgradeConfig(existingContent, DEFAULT_CONFIG);

    // Write back
    await fs.writeFile(configPath, upgradedContent, 'utf8');

    console.log(chalk.green(`✓ Upgraded project config: ${configPath}`));
    return true;
  } catch (err) {
    console.error(chalk.red(`✗ Error upgrading project config: ${err.message}`));
    return false;
  }
}

/**
 * Upgrade global config
 */
async function upgradeGlobalConfig() {
  const globalPath = getGlobalConfigPath();

  // Get the global template
  const GLOBAL_TEMPLATE = `# Global Code Review CLI Configuration
# This file stores your API keys and global settings
# It will be merged with project-specific .code-review.config files

providers:
  openrouter:
    enabled: false
    api_key: YOUR_OPENROUTER_API_KEY_HERE
    models:
      - anthropic/claude-sonnet-4
    # max_tokens: 3000  # Optional: Maximum tokens for model response (default: 3000)
    # temperature: 0.7  # Optional: Sampling temperature 0-2 (default: 0.7)

  openai:
    enabled: false
    api_key: YOUR_OPENAI_API_KEY_HERE
    models:
      - gpt-4o-mini
    # max_tokens: 3000  # Optional: Maximum tokens for model response (default: 3000)
    # temperature: 0.7  # Optional: Sampling temperature 0-2 (default: 0.7)
    # Note: GPT-5, o1, o3 models don't support custom temperature (fixed at 1.0)
    # Note: GPT-5, o1, o3 automatically get 3x max_tokens (for reasoning + output)

  anthropic:
    enabled: false
    api_key: YOUR_ANTHROPIC_API_KEY_HERE
    models:
      - claude-sonnet-4-5
    # max_tokens: 3000  # Optional: Maximum tokens for model response (default: 3000)
    # temperature: 0.7  # Optional: Sampling temperature 0-2 (default: 0.7)

# Note: Ollama doesn't need API keys (runs locally)
# Project-specific configs can override these settings
`;

  try {
    // Check if global config exists
    try {
      await fs.access(globalPath);
    } catch {
      console.log(chalk.yellow(`⚠️  No global config found: ${globalPath}`));
      console.log(chalk.gray('Run `crc setup-global` to create one.\n'));
      return false;
    }

    // Read existing config
    const existingContent = await fs.readFile(globalPath, 'utf8');

    // Upgrade config
    const upgradedContent = upgradeConfig(existingContent, GLOBAL_TEMPLATE);

    // Write back
    await fs.writeFile(globalPath, upgradedContent, 'utf8');

    console.log(chalk.green(`✓ Upgraded global config: ${globalPath}`));
    return true;
  } catch (err) {
    console.error(chalk.red(`✗ Error upgrading global config: ${err.message}`));
    return false;
  }
}

/**
 * Main upgrade command
 */
async function configUpgradeCommand(options = {}) {
  displayCommandHeader({ action: 'Upgrade Configuration' });

  const isGlobal = options.global || false;

  try {
    if (isGlobal) {
      const success = await upgradeGlobalConfig();
      if (success) {
        console.log(chalk.blue('\n📝 Your global config has been upgraded!'));
        console.log(chalk.gray('New config options and comments have been added.\n'));
      }
    } else {
      const success = await upgradeProjectConfig();
      if (success) {
        console.log(chalk.blue('\n📝 Your project config has been upgraded!'));
        console.log(chalk.gray('New config options and comments have been added.\n'));
      }
    }
  } catch (err) {
    console.error(chalk.red(`✗ Error: ${err.message}`));
    process.exit(1);
  }
}

module.exports = { configUpgradeCommand };
