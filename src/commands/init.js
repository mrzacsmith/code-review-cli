const fs = require('fs').promises;
const chalk = require('chalk');
const { DEFAULT_CONFIG } = require('../config/template');
const { displayCommandHeader } = require('../output');

async function initCommand() {
  displayCommandHeader({ action: 'Initialize Project' });
  const configPath = '.code-review.config';
  const reportsDir = '.code-reviews';

  try {
    // Check if config already exists
    try {
      await fs.access(configPath);
      console.log(chalk.yellow(`⚠️  Configuration file already exists: ${configPath}`));
      console.log(chalk.gray('Skipping config creation.'));
    } catch {
      // File doesn't exist, create it
      await fs.writeFile(configPath, DEFAULT_CONFIG, 'utf8');
      console.log(chalk.green(`✓ Created configuration file: ${configPath}`));
    }

    // Create reports directory
    try {
      await fs.mkdir(reportsDir, { recursive: true });
      console.log(chalk.green(`✓ Created reports directory: ${reportsDir}`));
    } catch (err) {
      if (err.code !== 'EEXIST') {
        throw err;
      }
      console.log(chalk.gray(`Reports directory already exists: ${reportsDir}`));
    }

    console.log(chalk.blue('\n📝 Next steps:'));
    console.log(chalk.gray('1. Add code-review files to .gitignore: `crc ignore`'));
    console.log(chalk.gray('2. Edit .code-review.config to configure your LLM providers'));
    console.log(chalk.gray('3. For API keys, either:'));
    console.log(chalk.gray('   - Add them to global config: ~/.code-review-cli/config.yaml'));
    console.log(chalk.gray('   - Or set environment variables (env:VARIABLE_NAME in config)'));
    console.log(chalk.gray('4. Run `crc` to review your latest commit\n'));
  } catch (err) {
    console.error(chalk.red(`✗ Error: ${err.message}`));
    process.exit(1);
  }
}

module.exports = { initCommand };

