#!/usr/bin/env node

const updateNotifier = require('update-notifier');
const chalk = require('chalk');
const packageJson = require('../package.json');
const { program } = require('../src/cli');

// Check for updates (cached for 24 hours by default)
const notifier = updateNotifier({
  pkg: packageJson,
  updateCheckInterval: 1000 * 60 * 60 * 24, // 24 hours
});

// Custom colorful update notification
if (notifier.update) {
  const { current, latest } = notifier.update;

  console.log();
  console.log(chalk.bgYellow.black.bold(' UPDATE AVAILABLE '));
  console.log();
  console.log(`  ${chalk.gray('Current version:')} ${chalk.red(current)}`);
  console.log(`  ${chalk.gray('Latest version:')}  ${chalk.green.bold(latest)}`);
  console.log();
  console.log(`  ${chalk.cyan('Run:')} ${chalk.bold.white(`npm update -g ${packageJson.name}`)}`);
  console.log();
  console.log(chalk.gray('  ────────────────────────────────────────────────'));
  console.log();
}

program.parse(process.argv);

