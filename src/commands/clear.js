const fs = require('fs').promises;
const path = require('path');
const { loadConfig } = require('../config/loader');
const {
  createSpinner,
  error,
  success,
  info,
  header,
} = require('../output');

/**
 * Clear command - remove all code review reports
 */
async function clearCommand() {
  const spinner = createSpinner('Loading configuration...');

  try {
    // Load config to get reports directory
    const config = await loadConfig();
    const reportsDir = config.output?.reports_dir || '.code-reviews';
    
    spinner.text = `Checking reports directory: ${reportsDir}...`;
    
    // Check if directory exists
    try {
      await fs.access(reportsDir);
    } catch (err) {
      spinner.stop();
      info(`Reports directory "${reportsDir}" does not exist. Nothing to clear.`);
      process.exit(0);
    }

    // Read all files in the directory
    spinner.text = 'Scanning for report files...';
    const files = await fs.readdir(reportsDir);
    
    // Filter for markdown files (report files)
    const reportFiles = files.filter((file) => file.endsWith('.md'));
    
    if (reportFiles.length === 0) {
      spinner.stop();
      info(`No report files found in "${reportsDir}".`);
      process.exit(0);
    }

    spinner.stop();
    header('Clearing Code Review Reports');
    info(`Found ${reportFiles.length} report file(s) to delete.\n`);

    // Delete each file
    const deleteSpinner = createSpinner('Deleting reports...');
    let deletedCount = 0;
    let errorCount = 0;

    for (const file of reportFiles) {
      try {
        const filePath = path.join(reportsDir, file);
        await fs.unlink(filePath);
        deletedCount++;
      } catch (err) {
        errorCount++;
        console.error(`Failed to delete ${file}: ${err.message}`);
      }
    }

    deleteSpinner.stop();

    // Show summary
    if (deletedCount > 0) {
      success(`Successfully deleted ${deletedCount} report file(s).`);
    }
    
    if (errorCount > 0) {
      error(`Failed to delete ${errorCount} file(s).`);
      process.exit(1);
    }

    process.exit(0);
  } catch (err) {
    if (spinner.isSpinning) {
      spinner.stop();
    }
    error(`Failed to clear reports: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { clearCommand };

