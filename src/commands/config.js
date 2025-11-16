const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const { exec } = require('child_process');
const { promisify } = require('util');
const { getGlobalConfigPath } = require('../config/loader');

const execAsync = promisify(exec);

/**
 * Get editor command (prefer GUI editors)
 */
async function getEditorCommand() {
  // Check for Cursor first (if available)
  try {
    await execAsync('which cursor');
    return 'cursor';
  } catch {
    // Check for VS Code
    try {
      await execAsync('which code');
      return 'code';
    } catch {
      // Fall back to environment variable or system default
      return process.env.EDITOR || process.env.VISUAL || (process.platform === 'darwin' ? 'open -e' : 'nano');
    }
  }
}

/**
 * Edit file in editor (opens in GUI editor if available)
 */
async function editFile(filePath) {
  const editor = await getEditorCommand();
  
  try {
    if (editor === 'cursor' || editor === 'code') {
      // Open in Cursor/VS Code (non-blocking, opens in new tab)
      execAsync(`${editor} "${filePath}"`).catch(() => {
        // Ignore errors - editor might already be open
      });
      
      console.log(chalk.blue(`\n📝 File opened in ${editor === 'cursor' ? 'Cursor' : 'VS Code'}`));
      console.log(chalk.gray('Make your changes and save the file, then press Enter to continue...\n'));
      
      // Wait for user to press Enter
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      
      return new Promise((resolve) => {
        rl.question(chalk.blue('Press Enter after saving the file... '), () => {
          rl.close();
          resolve();
        });
      });
    } else {
      // Terminal editor (nano, vim, etc.) - blocking
      await execAsync(`${editor} "${filePath}"`);
    }
  } catch (err) {
    // If editor command fails, try opening with system default
    if (process.platform === 'darwin') {
      await execAsync(`open -e "${filePath}"`);
    } else if (process.platform === 'win32') {
      await execAsync(`notepad "${filePath}"`);
    } else {
      await execAsync(`xdg-open "${filePath}"`);
    }
  }
}

/**
 * Get project config path
 */
function getProjectConfigPath() {
  return path.resolve('.code-review.config');
}

/**
 * Show config file
 */
async function showConfigCommand(type) {
  try {
    let configPath;
    let configType;

    if (type === 'global') {
      configPath = getGlobalConfigPath();
      configType = 'Global';
    } else if (type === 'project') {
      configPath = getProjectConfigPath();
      configType = 'Project';
    } else {
      console.error(chalk.red(`✗ Invalid config type: ${type}`));
      console.log(chalk.gray('Usage: crc config <global|project> show\n'));
      process.exit(1);
    }

    // Check if file exists
    try {
      await fs.access(configPath);
    } catch {
      console.error(chalk.red(`✗ ${configType} config file not found: ${configPath}`));
      if (type === 'global') {
        console.log(chalk.gray('Run "crc setup-global" to create it.\n'));
      } else {
        console.log(chalk.gray('Run "crc init" to create it.\n'));
      }
      process.exit(1);
    }

    // Read and display config
    const content = await fs.readFile(configPath, 'utf8');

    console.log(chalk.blue(`\n📝 ${configType} Configuration\n`));
    console.log(chalk.gray(`Location: ${configPath}\n`));
    console.log(chalk.white('─'.repeat(60)));
    console.log(content);
    console.log(chalk.white('─'.repeat(60)));
    console.log(chalk.gray(`\n💡 Tip: Use "crc config ${type} edit" to edit this file\n`));
  } catch (err) {
    console.error(chalk.red(`✗ Error: ${err.message}`));
    process.exit(1);
  }
}

/**
 * Edit config file
 */
async function editConfigCommand(type) {
  try {
    let configPath;
    let configType;

    if (type === 'global') {
      configPath = getGlobalConfigPath();
      configType = 'global';
    } else if (type === 'project') {
      configPath = getProjectConfigPath();
      configType = 'project';
    } else {
      console.error(chalk.red(`✗ Invalid config type: ${type}`));
      console.log(chalk.gray('Usage: crc config <global|project> edit\n'));
      process.exit(1);
    }

    // Check if file exists, create if it doesn't
    let content = '';
    try {
      content = await fs.readFile(configPath, 'utf8');
    } catch {
      // File doesn't exist
      if (type === 'global') {
        console.log(chalk.yellow(`⚠️  Global config doesn't exist. Creating it...\n`));
        // Create directory if needed
        const globalDir = path.dirname(configPath);
        await fs.mkdir(globalDir, { recursive: true });
        // Use template from setupGlobal
        const { DEFAULT_CONFIG } = require('../config/template');
        content = DEFAULT_CONFIG;
      } else {
        console.error(chalk.red(`✗ Project config file not found: ${configPath}`));
        console.log(chalk.gray('Run "crc init" to create it.\n'));
        process.exit(1);
      }
    }

    console.log(chalk.blue(`\n📝 Editing ${configType} configuration\n`));
    console.log(chalk.gray(`Location: ${configPath}\n`));
    console.log(chalk.gray('Opening editor...\n'));

    // Edit in default editor (reuse the editFile function from prompt.js)
    const tempDir = require('os').tmpdir();
    const tempFile = path.join(tempDir, `crc-config-${Date.now()}.tmp`);
    await fs.writeFile(tempFile, content, 'utf8');

    await editFile(tempFile);

    // Read edited content
    const editedContent = await fs.readFile(tempFile, 'utf8');

    // Save to actual location
    await fs.writeFile(configPath, editedContent, 'utf8');

    // Clean up temp file
    await fs.unlink(tempFile).catch(() => {});

    console.log(chalk.green(`✓ ${configType.charAt(0).toUpperCase() + configType.slice(1)} configuration saved to: ${configPath}\n`));
  } catch (err) {
    console.error(chalk.red(`✗ Error: ${err.message}`));
    process.exit(1);
  }
}

/**
 * Config command handler
 */
async function configCommand(type, action) {
  if (!type) {
    console.log(chalk.blue('Usage: crc config <global|project> [action]\n'));
    console.log(chalk.gray('Actions:'));
    console.log(chalk.gray('  show  - Show configuration file (default)'));
    console.log(chalk.gray('  edit  - Edit configuration file'));
    console.log(chalk.gray('\nExamples:'));
    console.log(chalk.gray('  crc config global        - Show global config'));
    console.log(chalk.gray('  crc config project        - Show project config'));
    console.log(chalk.gray('  crc config global edit    - Edit global config'));
    console.log(chalk.gray('  crc config project edit   - Edit project config\n'));
    process.exit(1);
  }

  if (type !== 'global' && type !== 'project') {
    console.error(chalk.red(`✗ Invalid config type: ${type}`));
    console.log(chalk.gray('Must be "global" or "project"\n'));
    process.exit(1);
  }

  // Default action is 'show'
  const actualAction = action || 'show';

  if (actualAction === 'show') {
    await showConfigCommand(type);
  } else if (actualAction === 'edit') {
    await editConfigCommand(type);
  } else {
    console.error(chalk.red(`✗ Unknown action: ${actualAction}`));
    console.log(chalk.gray('Available actions: show, edit\n'));
    process.exit(1);
  }
}

module.exports = { configCommand };

