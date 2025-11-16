const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const chalk = require('chalk');
const {
  loadPromptTemplate,
  savePromptTemplate,
  deletePromptTemplate,
} = require('../prompts/manager');

const execAsync = promisify(exec);

/**
 * Get default editor (EDITOR env var or fallback)
 */
function getEditor() {
  return process.env.EDITOR || process.env.VISUAL || 'nano';
}

/**
 * Edit file in default editor
 */
async function editFile(filePath) {
  const editor = getEditor();
  try {
    await execAsync(`${editor} "${filePath}"`);
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
 * Show prompt template
 */
async function showPromptCommand(useGlobal = false) {
  try {
    const { content, source, path: templatePath } = await loadPromptTemplate(useGlobal);

    console.log(chalk.blue(`\n📝 Prompt Template (${source})\n`));
    if (templatePath) {
      console.log(chalk.gray(`Location: ${templatePath}\n`));
    } else {
      console.log(chalk.gray('Using default template (not saved to file)\n'));
    }
    console.log(chalk.white('─'.repeat(60)));
    console.log(content);
    console.log(chalk.white('─'.repeat(60)));
    console.log(chalk.gray('\n💡 Tip: Use "crc prompt edit" to customize this template\n'));
  } catch (err) {
    console.error(chalk.red(`✗ Error: ${err.message}`));
    process.exit(1);
  }
}

/**
 * Edit prompt template
 */
async function editPromptCommand(useGlobal = false) {
  try {
    // Load existing or default template
    const { content } = await loadPromptTemplate(useGlobal);

    // Create temp file for editing
    const tempDir = require('os').tmpdir();
    const tempFile = path.join(tempDir, `crc-prompt-${Date.now()}.tmp`);
    await fs.writeFile(tempFile, content, 'utf8');

    console.log(chalk.blue(`\n📝 Editing prompt template (${useGlobal ? 'global' : 'project'})\n`));
    console.log(chalk.gray('Opening editor...\n'));

    // Edit in default editor
    await editFile(tempFile);

    // Read edited content
    const editedContent = await fs.readFile(tempFile, 'utf8');

    // Save to actual location
    const { path: savedPath } = await savePromptTemplate(editedContent, useGlobal);

    // Clean up temp file
    await fs.unlink(tempFile).catch(() => {});

    console.log(chalk.green(`✓ Prompt template saved to: ${savedPath}\n`));
  } catch (err) {
    console.error(chalk.red(`✗ Error: ${err.message}`));
    process.exit(1);
  }
}

/**
 * Reset prompt template to default
 */
async function resetPromptCommand(useGlobal = false) {
  try {
    const deleted = await deletePromptTemplate(useGlobal);
    const location = useGlobal ? 'global' : 'project';

    if (deleted) {
      console.log(chalk.green(`✓ ${location.charAt(0).toUpperCase() + location.slice(1)} prompt template reset to default\n`));
    } else {
      console.log(chalk.yellow(`⚠ No ${location} prompt template found (already using default)\n`));
    }
  } catch (err) {
    console.error(chalk.red(`✗ Error: ${err.message}`));
    process.exit(1);
  }
}

module.exports = {
  showPromptCommand,
  editPromptCommand,
  resetPromptCommand,
};

