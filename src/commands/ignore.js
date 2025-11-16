const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const {
  createSpinner,
  success,
  error,
  info,
} = require('../output');

/**
 * Ignore command - add code-review files to .gitignore
 */
async function ignoreCommand() {
  const spinner = createSpinner('Updating .gitignore...');
  const gitignorePath = '.gitignore';

  try {
    // Read existing .gitignore or create empty content
    let gitignoreContent = '';
    try {
      gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
      // File doesn't exist, will create it
      info('Creating new .gitignore file...');
    }

    // Entries to add
    const entriesToAdd = [
      '.code-reviews/',
      '.code-review.config',
    ];

    // Check what's already there
    const lines = gitignoreContent.split('\n');
    const existingEntries = new Set(lines.map((line) => line.trim()));
    const entriesToAddFiltered = entriesToAdd.filter(
      (entry) => !existingEntries.has(entry)
    );

    if (entriesToAddFiltered.length === 0) {
      spinner.stop();
      info('All code-review entries are already in .gitignore.');
      process.exit(0);
    }

    // Add entries
    let updatedContent = gitignoreContent;
    
    // Add section header if file has content and doesn't end with newline
    if (updatedContent && !updatedContent.endsWith('\n')) {
      updatedContent += '\n';
    }
    
    // Add section header if there's existing content
    if (updatedContent.trim() && !updatedContent.includes('# Code Review CLI')) {
      updatedContent += '\n# Code Review CLI\n';
    } else if (!updatedContent.trim()) {
      updatedContent += '# Code Review CLI\n';
    }

    // Add entries
    for (const entry of entriesToAddFiltered) {
      updatedContent += `${entry}\n`;
    }

    // Write updated .gitignore
    await fs.writeFile(gitignorePath, updatedContent, 'utf8');

    spinner.stop();

    if (entriesToAddFiltered.length === entriesToAdd.length) {
      success(`Added ${entriesToAddFiltered.length} entry/entries to .gitignore`);
    } else {
      success(`Added ${entriesToAddFiltered.length} new entry/entries to .gitignore`);
      info(`${entriesToAdd.length - entriesToAddFiltered.length} entry/entries were already present`);
    }

    info(`\nUpdated .gitignore with:`);
    entriesToAddFiltered.forEach((entry) => {
      console.log(chalk.gray(`  - ${entry}`));
    });

    process.exit(0);
  } catch (err) {
    spinner.stop();
    error(`Failed to update .gitignore: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { ignoreCommand };

