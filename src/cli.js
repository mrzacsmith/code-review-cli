const { Command } = require('commander');
const { initCommand } = require('./commands/init');
const { fastScanCommand } = require('./commands/fastScan');
const { setupGlobalCommand } = require('./commands/setupGlobal');

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
  .command('setup-global')
  .description('Set up global configuration file for API keys')
  .action(setupGlobalCommand);

program
  .command('summarize')
  .description('Generate codebase summary')
  .action(() => {
    console.log('Summarize command - coming soon');
  });

// Config command (placeholder - will be implemented)
program
  .command('config')
  .description('Manage configuration (global or project)')
  .argument('[type]', 'config type: global or project')
  .action((type) => {
    if (!type) {
      console.log('Usage: crc config <global|project>');
      console.log('  crc config global  - Manage global configuration');
      console.log('  crc config project - Manage project configuration');
      process.exit(1);
    } else {
      console.log(`Config command for "${type}" - coming soon`);
      console.log('Use "crc config global" or "crc config project"');
      process.exit(1);
    }
  });

// Prompt command (placeholder - will be implemented)
program
  .command('prompt')
  .description('Manage review prompt templates')
  .argument('[action]', 'action: edit, show, or reset')
  .option('--global', 'Edit global prompt template')
  .action((action, options) => {
    if (!action) {
      console.log('Usage: crc prompt <edit|show|reset>');
      console.log('  crc prompt edit     - Edit prompt template');
      console.log('  crc prompt show     - Show current prompt template');
      console.log('  crc prompt reset    - Reset to default prompt');
      process.exit(1);
    } else {
      console.log(`Prompt command "${action}" - coming soon`);
      process.exit(1);
    }
  });

// Default action - only runs when no command is provided
program
  .allowUnknownOption(false)
  .option('--fast', 'Fast scan (default)')
  .option('--deep', 'Deep scan with transitive dependencies')
  .option('--clean', 'Clean report directory')
  .action((options) => {
    // Check if a command was provided (not just options)
    const args = process.argv.slice(2);
    const hasCommand = args.some((arg) => !arg.startsWith('--') && arg !== 'crc');
    
    // If a command was provided but not recognized, show error
    if (hasCommand && !options.clean && !options.deep && !options.fast) {
      const command = args.find((arg) => !arg.startsWith('--'));
      if (command && !['init', 'setup-global', 'summarize', 'config', 'prompt'].includes(command)) {
        console.error(`\n✗ Unknown command: ${command}`);
        console.error(`\nRun 'crc --help' to see available commands.\n`);
        process.exit(1);
      }
    }
    
    // Run default action only if no command was provided
    if (options.clean) {
      console.log('Clean command - coming soon');
    } else if (options.deep) {
      console.log('Deep scan - coming soon');
    } else {
      // Default to fast scan
      fastScanCommand();
    }
  });

module.exports = { program };

