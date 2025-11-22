const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const { getGlobalConfigPath } = require('../config/loader');

const GLOBAL_CONFIG_TEMPLATE = `# Global Code Review CLI Configuration
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

async function setupGlobalCommand() {
  const globalPath = getGlobalConfigPath();
  const globalDir = path.dirname(globalPath);

  try {
    // Check if global config already exists
    try {
      await fs.access(globalPath);
      console.log(chalk.yellow(`⚠️  Global config already exists: ${globalPath}`));
      console.log(chalk.gray('Edit it directly to update your API keys.\n'));
      return;
    } catch {
      // File doesn't exist, create it
    }

    // Create directory if it doesn't exist
    await fs.mkdir(globalDir, { recursive: true });

    // Create config file
    await fs.writeFile(globalPath, GLOBAL_CONFIG_TEMPLATE, 'utf8');

    console.log(chalk.green(`✓ Created global config: ${globalPath}`));
    console.log(chalk.blue('\n📝 Next steps:'));
    console.log(chalk.gray('1. Edit the file and add your API keys'));
    console.log(chalk.gray('2. These keys will work across all projects'));
    console.log(chalk.gray('3. Project-specific configs can override these settings\n'));
  } catch (err) {
    console.error(chalk.red(`✗ Error: ${err.message}`));
    process.exit(1);
  }
}

module.exports = { setupGlobalCommand };

