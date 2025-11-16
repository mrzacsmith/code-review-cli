const { getChangedFiles, getLatestCommitDiff, hasUncommittedChanges } = require('../git');
const { loadRulesFromConfig } = require('../rules');
const { loadFiles } = require('../files');
const { getDependencies } = require('../dependencies');
const { buildReviewPrompt, buildContext } = require('../prompts');
const { createProviders } = require('../providers');
const { generateAndSaveReport } = require('../reports');
const { loadConfig, getEnabledProviders } = require('../config/loader');
const {
  createSpinner,
  error,
  warning,
  info,
  header,
  displaySummary,
} = require('../output');

/**
 * Fast scan command - review latest commit
 */
async function fastScanCommand() {
  const spinner = createSpinner('Initializing...');

  try {
    // Check for uncommitted changes
    spinner.text = 'Checking for uncommitted changes...';
    const hasUncommitted = await hasUncommittedChanges();
    if (hasUncommitted) {
      spinner.stop();
      warning('Uncommitted changes detected. Only committed code will be reviewed.');
    }

    // Load config
    spinner.text = 'Loading configuration...';
    const config = await loadConfig();
    const enabledProviders = getEnabledProviders(config);
    
    if (enabledProviders.length === 0) {
      spinner.stop();
      error('No providers enabled in configuration. Please edit .code-review.config');
      process.exit(1);
    }

    // Get git information
    spinner.text = 'Analyzing git commit...';
    const changedFilesData = await getChangedFiles();
    const diffData = await getLatestCommitDiff();

    // Load rules
    spinner.text = 'Loading project rules...';
    const rules = await loadRulesFromConfig(config);

    // Load changed files
    spinner.text = 'Loading changed files...';
    const filePaths = changedFilesData.files.map((f) => f.path);
    const filesResult = await loadFiles(filePaths);

    // Get dependencies
    spinner.text = 'Analyzing dependencies...';
    const dependencyPaths = await getDependencies(filePaths);
    const dependenciesResult = await loadFiles(dependencyPaths);

    // Build context and prompt
    spinner.text = 'Building review context...';
    const context = buildContext({
      rules,
      diff: diffData.diff,
      changedFiles: filesResult.files,
      dependencyFiles: dependenciesResult.files,
    });

    const prompt = await buildReviewPrompt(context);

    // Create providers
    spinner.text = 'Initializing providers...';
    const providers = createProviders(config);

    if (providers.length === 0) {
      spinner.stop();
      error('No valid providers could be initialized. Check your configuration.');
      process.exit(1);
    }

    // Run reviews in parallel
    spinner.stop();
    header('Running Code Reviews');
    info(`Reviewing with ${providers.length} provider(s)...\n`);

    const reviewSpinner = createSpinner('Sending requests to models...');
    const results = await Promise.all(
      providers.map((provider) => provider.review(prompt))
    );
    reviewSpinner.stop();

    // Generate report
    const reportSpinner = createSpinner('Generating report...');
    const report = await generateAndSaveReport(
      {
        commit: changedFilesData.commit,
        scanType: 'fast',
        filesChanged: changedFilesData.files,
        providers: enabledProviders,
        results,
      },
      config.output?.reports_dir || '.code-reviews'
    );
    reportSpinner.stop();

    // Display summary
    const successfulReviews = results.reduce(
      (sum, r) => sum + (r.successCount || 0),
      0
    );
    const totalReviews = results.reduce(
      (sum, r) => sum + (r.totalCount || 0),
      0
    );

    displaySummary({
      commit: changedFilesData.commit,
      filesChanged: changedFilesData.files,
      providersUsed: providers.length,
      successfulReviews,
      failedReviews: totalReviews - successfulReviews,
      reportPath: report.filePath,
    });

    // Exit with appropriate code
    if (successfulReviews === 0) {
      process.exit(1);
    }
  } catch (err) {
    if (spinner.isSpinning) {
      spinner.stop();
    }
    error(err.message);
    process.exit(1);
  }
}

module.exports = { fastScanCommand };

