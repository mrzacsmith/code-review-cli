const { Command } = require('commander');
const { initCommand } = require('./commands/init');

const program = new Command();

program
  .name('crc')
  .description('Code Review CLI - AI-powered code review of git commits')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize code review configuration')
  .action(initCommand);

program
  .command('summarize')
  .description('Generate codebase summary')
  .action(() => {
    console.log('Summarize command - coming soon');
  });

program
  .option('--fast', 'Fast scan (default)')
  .option('--deep', 'Deep scan with transitive dependencies')
  .option('--clean', 'Clean report directory')
  .action((options) => {
    if (options.clean) {
      console.log('Clean command - coming soon');
    } else if (options.deep) {
      console.log('Deep scan - coming soon');
    } else {
      console.log('Fast scan - coming soon');
    }
  });

module.exports = { program };

