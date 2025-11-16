const chalk = require('chalk');
const ora = require('ora');

/**
 * Display progress spinner
 */
function createSpinner(text) {
  return ora(text).start();
}

/**
 * Display success message
 */
function success(message) {
  console.log(chalk.green(`✓ ${message}`));
}

/**
 * Display error message
 */
function error(message) {
  console.log(chalk.red(`✗ ${message}`));
}

/**
 * Display warning message
 */
function warning(message) {
  console.log(chalk.yellow(`⚠ ${message}`));
}

/**
 * Display info message
 */
function info(message) {
  console.log(chalk.blue(`ℹ ${message}`));
}

/**
 * Display section header
 */
function header(text) {
  console.log(chalk.bold.cyan(`\n${text}\n`));
}

/**
 * Display summary statistics
 */
function displaySummary(stats) {
  header('Review Summary');

  console.log(chalk.gray(`Commit: ${stats.commit.shortHash}`));
  console.log(chalk.gray(`Files Changed: ${stats.filesChanged.length}`));
  
  // Display Local LLMs and API LLMs separately
  if (stats.localModels > 0 && stats.apiModels > 0) {
    console.log(chalk.gray(`Local LLMs: ${stats.localModels}`));
    console.log(chalk.gray(`API LLMs: ${stats.apiModels}`));
  } else if (stats.localModels > 0) {
    console.log(chalk.gray(`Local LLMs: ${stats.localModels}`));
  } else if (stats.apiModels > 0) {
    console.log(chalk.gray(`API LLMs: ${stats.apiModels}`));
  }
  
  console.log(chalk.gray(`Total LLM Models: ${stats.totalModels}`));
  console.log(chalk.gray(`Successful Reviews: ${stats.successfulReviews}`));
  console.log(chalk.gray(`Failed Reviews: ${stats.failedReviews}`));

  if (stats.reportPath) {
    console.log(chalk.green(`\nReport saved: ${stats.reportPath}`));
  }
}

/**
 * Display provider progress
 */
function displayProviderProgress(providerName, modelName, status) {
  const statusColors = {
    pending: chalk.gray,
    processing: chalk.blue,
    success: chalk.green,
    error: chalk.red,
  };

  const statusIcons = {
    pending: '○',
    processing: '◐',
    success: '✓',
    error: '✗',
  };

  const color = statusColors[status] || chalk.gray;
  const icon = statusIcons[status] || '○';

  console.log(`  ${color(icon)} ${providerName} / ${modelName}`);
}

module.exports = {
  createSpinner,
  success,
  error,
  warning,
  info,
  header,
  displaySummary,
  displayProviderProgress,
};

