const chalk = require('chalk');
const { loadConfig, getEnabledProviders } = require('../config/loader');
const { displayCommandHeader } = require('../output');

/**
 * Enhanced help system with colors, sections, and live status
 */

/**
 * Create a visual box header
 */
function createBoxHeader(title) {
  const boxWidth = 62;
  const titlePadding = Math.max(0, boxWidth - title.length - 4);
  const leftPad = Math.floor(titlePadding / 2);
  const rightPad = titlePadding - leftPad;
  
  return [
    chalk.blue('╔' + '═'.repeat(boxWidth) + '╗'),
    chalk.blue('║') + ' '.repeat(leftPad) + chalk.white.bold(title) + ' '.repeat(rightPad) + chalk.blue('║'),
    chalk.blue('╚' + '═'.repeat(boxWidth) + '╝')
  ].join('\n');
}

/**
 * Create a section header
 */
function createSectionHeader(emoji, title) {
  return chalk.cyan.bold(`${emoji} ${title.toUpperCase()}`);
}

/**
 * Get live provider status
 */
async function getLiveProviderStatus() {
  try {
    const config = await loadConfig();
    const enabledProviders = getEnabledProviders(config);
    
    let localModels = 0;
    let apiModels = 0;
    let totalProviders = 0;
    
    for (const provider of enabledProviders) {
      totalProviders++;
      const modelCount = (provider.models || []).length;
      
      if (provider.name === 'ollama') {
        localModels += modelCount;
      } else {
        apiModels += modelCount;
      }
    }
    
    return {
      totalProviders,
      localModels,
      apiModels,
      totalModels: localModels + apiModels,
      hasConfig: true
    };
  } catch (err) {
    return {
      totalProviders: 0,
      localModels: 0,
      apiModels: 0,
      totalModels: 0,
      hasConfig: false,
      error: err.message
    };
  }
}

/**
 * Display main help
 */
async function displayMainHelp() {
  displayCommandHeader({ action: 'Help System' });
  
  console.log(createBoxHeader('🔍 CODE REVIEW CLI - Available Commands'));
  console.log();
  
  // Review Commands Section
  console.log(createSectionHeader('📋', 'Review Commands'));
  console.log(`  ${chalk.green('crc')}                     Review latest commit`);
  console.log(`  ${chalk.green('crc --commits 3')}         Review last 3 commits`);
  console.log(`  ${chalk.green('crc --branch')}            Review current branch vs main`);
  console.log(`  ${chalk.green('crc --since main')}        Review commits since branching`);
  console.log();
  
  // Setup Commands Section
  console.log(createSectionHeader('⚙️', 'Setup Commands'));
  console.log(`  ${chalk.green('crc init')}                Initialize project configuration`);
  console.log(`  ${chalk.green('crc setup-global')}        Configure API keys globally`);
  console.log(`  ${chalk.green('crc doctor')}              Check provider status`);
  console.log();
  
  // Management Commands Section
  console.log(createSectionHeader('🔧', 'Management Commands'));
  console.log(`  ${chalk.green('crc config')}              Manage configuration`);
  console.log(`  ${chalk.green('crc prompt')}              Manage review prompts`);
  console.log(`  ${chalk.green('crc show <provider>')}     Show available models`);
  console.log(`  ${chalk.green('crc clear')}               Remove all reports`);
  console.log();
  
  // Live Status Section
  const status = await getLiveProviderStatus();
  console.log(createSectionHeader('🔍', 'Current Status'));
  
  if (status.hasConfig) {
    if (status.totalModels > 0) {
      console.log(`  ${chalk.green('✅')} Configuration: Found`);
      if (status.localModels > 0) {
        console.log(`  ${chalk.green('✅')} Local LLMs: ${status.localModels} available`);
      }
      if (status.apiModels > 0) {
        console.log(`  ${chalk.green('✅')} API LLMs: ${status.apiModels} configured`);
      }
      console.log(`  ${chalk.green('✅')} Total Models: ${status.totalModels} ready`);
    } else {
      console.log(`  ${chalk.yellow('⚠️')} Configuration: Found but no models enabled`);
    }
  } else {
    console.log(`  ${chalk.red('❌')} Configuration: Not found`);
    console.log(`  ${chalk.gray('    Run')} ${chalk.cyan('crc init')} ${chalk.gray('to get started')}`);
  }
  console.log();
  
  // Tips Section
  console.log(createSectionHeader('💡', 'Tips'));
  console.log(`  Use ${chalk.cyan('crc <command> ?')} for specific help`);
  console.log(`  Example: ${chalk.cyan('crc doctor ?')} shows available providers`);
  console.log(`  Use ${chalk.cyan('crc doctor')} to check your setup`);
  console.log();
}

/**
 * Display doctor-specific help
 */
async function displayDoctorHelp() {
  displayCommandHeader({ action: 'Doctor Help' });
  
  console.log(createBoxHeader('🩺 DOCTOR COMMAND - Provider Diagnostics'));
  console.log();
  
  console.log(createSectionHeader('📡', 'Available Providers'));
  console.log(`  ${chalk.green('crc doctor')}              Check all providers`);
  console.log(`  ${chalk.green('crc doctor ollama')}       Check Ollama (+ show installed models)`);
  console.log(`  ${chalk.green('crc doctor openai')}       Check OpenAI API connection`);
  console.log(`  ${chalk.green('crc doctor anthropic')}    Check Anthropic API connection`);
  console.log(`  ${chalk.green('crc doctor openrouter')}   Check OpenRouter API connection`);
  console.log();
  
  // Live Status for Doctor
  const status = await getLiveProviderStatus();
  console.log(createSectionHeader('🔍', 'Live Status'));
  
  if (status.hasConfig) {
    console.log(`  ${chalk.green('✅')} Configuration found`);
    console.log(`  ${chalk.blue('ℹ️')} Run ${chalk.cyan('crc doctor')} for detailed status`);
  } else {
    console.log(`  ${chalk.red('❌')} No configuration found`);
    console.log(`  ${chalk.gray('    Run')} ${chalk.cyan('crc init')} ${chalk.gray('first')}`);
  }
  console.log();
}

/**
 * Display config-specific help
 */
async function displayConfigHelp() {
  displayCommandHeader({ action: 'Config Help' });
  
  console.log(createBoxHeader('⚙️ CONFIG COMMAND - Configuration Management'));
  console.log();
  
  console.log(createSectionHeader('📁', 'Configuration Types'));
  console.log(`  ${chalk.green('crc config global')}       Show global configuration`);
  console.log(`  ${chalk.green('crc config project')}      Show project configuration`);
  console.log();
  
  console.log(createSectionHeader('✏️', 'Configuration Actions'));
  console.log(`  ${chalk.green('crc config global edit')}  Edit global config file`);
  console.log(`  ${chalk.green('crc config project edit')} Edit project config file`);
  console.log();
  
  console.log(createSectionHeader('📍', 'Current Status'));
  console.log(`  ${chalk.gray('Global config:')} ~/.code-review/config.yaml`);
  console.log(`  ${chalk.gray('Project config:')} ./.code-review.config`);
  console.log();
}

/**
 * Main help dispatcher
 */
async function showEnhancedHelp(context = null) {
  try {
    switch (context) {
      case 'doctor':
        await displayDoctorHelp();
        break;
      case 'config':
        await displayConfigHelp();
        break;
      default:
        await displayMainHelp();
        break;
    }
  } catch (err) {
    console.error(chalk.red(`Error displaying help: ${err.message}`));
    process.exit(1);
  }
}

module.exports = {
  showEnhancedHelp,
  displayMainHelp,
  displayDoctorHelp,
  displayConfigHelp,
};
