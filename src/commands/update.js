const { execSync } = require('child_process');
const chalk = require('chalk');
const ora = require('ora');
const packageJson = require('../../package.json');

async function updateCommand() {
  const spinner = ora('Checking for updates...').start();

  try {
    // Check current version
    const currentVersion = packageJson.version;

    // Get latest version from npm
    let latestVersion;
    try {
      const output = execSync(`npm view ${packageJson.name} version`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      latestVersion = output.trim();
    } catch (err) {
      spinner.fail('Failed to check for updates');
      console.error(chalk.red('\n✗ Could not connect to npm registry'));
      console.error(chalk.gray('Please check your internet connection and try again\n'));
      process.exit(1);
    }

    // Compare versions
    if (currentVersion === latestVersion) {
      spinner.succeed('Already up to date');
      console.log();
      console.log(chalk.green(`✓ You're running the latest version: ${chalk.bold(currentVersion)}`));
      console.log();
      return;
    }

    spinner.text = `Updating from ${currentVersion} to ${latestVersion}...`;

    // Run npm update
    try {
      execSync(`npm update -g ${packageJson.name}`, {
        stdio: 'inherit'
      });

      spinner.succeed('Update complete');
      console.log();
      console.log(chalk.green.bold(' UPDATE SUCCESSFUL '));
      console.log();
      console.log(`  ${chalk.gray('Previous version:')} ${chalk.red(currentVersion)}`);
      console.log(`  ${chalk.gray('Current version:')}  ${chalk.green.bold(latestVersion)}`);
      console.log();
    } catch (err) {
      spinner.fail('Update failed');
      console.log();
      console.log(chalk.red('✗ Failed to update package'));
      console.log();
      console.log(chalk.yellow('Try running manually:'));
      console.log(chalk.cyan(`  npm update -g ${packageJson.name}`));
      console.log();
      process.exit(1);
    }
  } catch (err) {
    spinner.fail('Update failed');
    console.error(chalk.red('\n✗ Error:'), err.message);
    console.log();
    process.exit(1);
  }
}

module.exports = { updateCommand };
