const { Command } = require('commander');
const { initCommand } = require('./commands/init');
const { fastScanCommand } = require('./commands/fastScan');
const { setupGlobalCommand } = require('./commands/setupGlobal');
const { clearCommand } = require('./commands/clear');
const { configCommand } = require('./commands/config');
const { ignoreCommand } = require('./commands/ignore');
const { doctorCommand } = require('./commands/doctor');
const {
  showPromptCommand,
  editPromptCommand,
  resetPromptCommand,
} = require('./commands/prompt');

const program = new Command();
const packageJson = require('../package.json');
const packageVersion = packageJson.version;

// Get npm package URL from package.json
function getNpmPackageUrl() {
  // Check if repository field exists
  if (packageJson.repository && typeof packageJson.repository === 'string') {
    // If it's a GitHub URL, convert to npmjs.com
    const match = packageJson.repository.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)/);
    if (match) {
      return `https://www.npmjs.com/package/${packageJson.name}`;
    }
  }
  // Fallback to npmjs.com URL based on package name
  return `https://www.npmjs.com/package/${packageJson.name}`;
}

// Create clickable terminal hyperlink (OSC 8 escape sequence)
// This makes URLs clickable in terminals that support it (iTerm2, VS Code, Windows Terminal, etc.)
function createClickableLink(url, text = url) {
  // OSC 8 escape sequence for hyperlinks: \x1b]8;;URL\x1b\\TEXT\x1b]8;;\x1b\\
  // Falls back to plain URL if terminal doesn't support hyperlinks
  return `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;
}

program
  .name('crc')
  .description('Code Review CLI - AI-powered code review of git commits')
  .version(packageVersion)
  .addHelpText('after', `\n📦 Documentation: ${createClickableLink(getNpmPackageUrl())}\n`);

program
  .command('init')
  .description('Initialize code review configuration')
  .action(initCommand);

program
  .command('ignore')
  .description('Add code-review files to .gitignore')
  .action(ignoreCommand);

program
  .command('doctor')
  .description('Check provider status and configuration')
  .argument('[provider]', 'provider to check (e.g., ollama)')
  .action((provider) => {
    doctorCommand(provider).catch((err) => {
      console.error('Error:', err.message);
      process.exit(1);
    });
  });

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

program
  .command('clear')
  .description('Remove all code review reports')
  .action(clearCommand);

// Config command
program
  .command('config')
  .description('Manage configuration (global or project)')
  .argument('[type]', 'config type: global or project')
  .argument('[action]', 'action: show or edit (default: show)')
  .action((type, action) => {
    configCommand(type, action).catch((err) => {
      console.error('Error:', err.message);
      process.exit(1);
    });
  });

// Prompt command
program
  .command('prompt')
  .description('Manage review prompt templates')
  .argument('[action]', 'action: edit, show, or reset')
  .option('--global', 'Use global prompt template (default: project)')
  .action((action, options) => {
    const useGlobal = options.global || false;

    if (!action) {
      console.log('Usage: crc prompt <edit|show|reset>');
      console.log('  crc prompt edit     - Edit prompt template');
      console.log('  crc prompt show     - Show current prompt template');
      console.log('  crc prompt reset    - Reset to default prompt');
      console.log('\nOptions:');
      console.log('  --global            - Use global template instead of project');
      process.exit(1);
    } else if (action === 'show') {
      showPromptCommand(useGlobal);
    } else if (action === 'edit') {
      editPromptCommand(useGlobal);
    } else if (action === 'reset') {
      resetPromptCommand(useGlobal);
    } else {
      console.error(`\n✗ Unknown action: ${action}`);
      console.log('Usage: crc prompt <edit|show|reset>\n');
      process.exit(1);
    }
  });

// Default action - only runs when no command is provided
program
  .allowUnknownOption(false)
  .option('--fast', 'Fast scan (default)')
  .option('--deep', 'Deep scan with transitive dependencies')
  .option('--clean', 'Clean report directory')
  .option('--commits <n>', 'Review last N commits (1-5)', parseInt)
  .option('-n <n>', 'Short alias for --commits', parseInt)
  .option('--branch [name]', 'Review branch vs main (current branch if no name provided)')
  .option('--since <branch>', 'Review commits since branching from specified branch')
  .action((options) => {
    // Check if a command was provided (not just options)
    const args = process.argv.slice(2);
    const hasCommand = args.some((arg) => !arg.startsWith('--') && arg !== 'crc');
    
    // If a command was provided but not recognized, show error
    if (hasCommand && !options.clean && !options.deep && !options.fast && !options.commits && !options.n && !options.branch && !options.since) {
      const command = args.find((arg) => !arg.startsWith('--'));
      if (command && !['init', 'setup-global', 'summarize', 'config', 'prompt', 'clear', 'ignore', 'doctor'].includes(command)) {
        console.error(`\n✗ Unknown command: ${command}`);
        console.error(`\nRun 'crc --help' to see available commands.\n`);
        process.exit(1);
      }
    }
    
    // Handle commit count options (-n takes precedence over --commits)
    const commitCount = options.n || options.commits;
    
    // Handle branch options
    const branchName = options.branch;
    const sinceBranch = options.since;
    
    // Validate that only one review type is specified
    const reviewTypes = [commitCount, branchName !== undefined, sinceBranch].filter(Boolean);
    if (reviewTypes.length > 1) {
      console.error('\n✗ Cannot combine --commits, --branch, and --since options');
      console.error('Use only one review type at a time\n');
      process.exit(1);
    }
    
    // Validate commit count if provided
    if (commitCount !== undefined) {
      if (!Number.isInteger(commitCount) || commitCount < 1 || commitCount > 5) {
        console.error('\n✗ Commit count must be an integer between 1 and 5');
        console.error('Examples: crc --commits 3, crc -n 2\n');
        process.exit(1);
      }
    }
    
    // Run default action only if no command was provided
    if (options.clean) {
      console.log('Clean command - coming soon');
    } else if (options.deep) {
      console.log('Deep scan - coming soon');
    } else {
      // Default to fast scan (with optional parameters)
      const scanOptions = {
        commitCount,
        branchName,
        sinceBranch,
      };
      
      fastScanCommand(scanOptions).catch((err) => {
        console.error('Error:', err.message);
        process.exit(1);
      });
    }
  });

module.exports = { program };

