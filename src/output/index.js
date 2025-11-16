const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const fs = require('fs');

/**
 * Get package version dynamically
 */
function getPackageVersion() {
  try {
    const packagePath = path.join(__dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return packageJson.version;
  } catch (err) {
    return '0.1.8'; // fallback version
  }
}

/**
 * Display colorful terminal header for command separation
 */
function displayCommandHeader(options = {}) {
  const {
    command = 'Code Review CLI',
    version = getPackageVersion(),
    action = '',
    project = '',
    branch = '',
    timestamp = new Date()
  } = options;

  // Get current time formatted
  const timeStr = timestamp.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });

  // Get project name from current directory if not provided
  const projectName = project || path.basename(process.cwd());

  // Build header content
  const rocket = chalk.cyan('🚀');
  const versionText = chalk.cyan.bold(`CRC v${version}`);
  const separator = chalk.gray('│');
  const actionText = action ? chalk.yellow.bold(action) : chalk.yellow.bold(command);
  const timeText = chalk.gray(timeStr);
  const projectText = chalk.green.bold(projectName);
  const branchText = branch ? chalk.magenta(`[${branch}]`) : '';

  // Construct header line
  let headerLine = `${rocket} ${versionText} ${separator} ${actionText} ${separator} ${timeText} ${separator} ${projectText}`;
  if (branchText) {
    headerLine += ` ${separator} ${branchText}`;
  }

  // Create separator line
  const separatorLine = chalk.blue('━'.repeat(80));

  // Display header
  console.log(''); // Empty line before header
  console.log(headerLine);
  console.log(separatorLine);
  console.log(''); // Empty line after header
}

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
  displayCommandHeader,
};

