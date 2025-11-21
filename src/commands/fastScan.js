const {
  getChangedFiles,
  getLatestCommitDiff,
  getLastNChangedFiles,
  getLastNCommitsDiff,
  getBranchChangedFiles,
  getBranchDiff,
  getChangedFilesSince,
  getCommitsSince,
  getDefaultBranch,
  hasUncommittedChanges
} = require('../git');
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
  displayCommandHeader,
} = require('../output');

/**
 * Fast scan command - review latest commit, last N commits, or branch comparison
 */
async function fastScanCommand(options = {}) {
  // Handle backward compatibility - if options is a number, treat as commitCount
  if (typeof options === 'number') {
    options = { commitCount: options };
  }
  
  const { commitCount, branchName, baseBranch, sinceBranch, deep, depth } = options;
  
  // Display command header
  let headerAction = 'Fast Scan';
  if (branchName !== undefined) {
    const targetBranch = branchName || 'current branch';
    headerAction = `Branch Review (${targetBranch})`;
  } else if (sinceBranch) {
    headerAction = `Since Branch (${sinceBranch})`;
  } else if (commitCount && commitCount > 1) {
    headerAction = `Multi-Commit Review (${commitCount})`;
  }
  
  displayCommandHeader({ action: headerAction });
  
  const spinner = createSpinner('Initializing...');

  try {
    // Validate commit count if provided
    if (commitCount !== undefined) {
      if (!Number.isInteger(commitCount) || commitCount < 1 || commitCount > 5) {
        spinner.stop();
        error('Commit count must be an integer between 1 and 5');
        process.exit(1);
      }
    }

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

    // Get git information - handle different review types
    let changedFilesData, diffData, scanType;
    
    if (branchName !== undefined) {
      // Branch comparison review
      // Auto-detect base branch if not provided
      const actualBaseBranch = baseBranch || await getDefaultBranch();
      const targetBranch = branchName || 'current branch';
      spinner.text = `Analyzing branch '${targetBranch}' vs ${actualBaseBranch}...`;
      changedFilesData = await getBranchChangedFiles(branchName, actualBaseBranch);
      diffData = await getBranchDiff(branchName, actualBaseBranch);
      scanType = branchName ? `branch-${branchName}` : 'branch-current';
    } else if (sinceBranch) {
      // Since branch review
      spinner.text = `Analyzing commits since '${sinceBranch}'...`;
      changedFilesData = await getChangedFilesSince(sinceBranch);
      diffData = await getCommitsSince(sinceBranch);
      scanType = `since-${sinceBranch}`;
    } else if (commitCount && commitCount > 1) {
      // Multi-commit review
      spinner.text = `Analyzing last ${commitCount} commits...`;
      changedFilesData = await getLastNChangedFiles(commitCount);
      diffData = await getLastNCommitsDiff(commitCount);
      scanType = `fast-${commitCount}`;
    } else {
      // Single commit review (default)
      spinner.text = 'Analyzing git commit...';
      changedFilesData = await getChangedFiles();
      diffData = await getLatestCommitDiff();
      scanType = 'fast';
    }

    // Load rules
    spinner.text = 'Loading project rules...';
    const rules = await loadRulesFromConfig(config);

    // Load changed files
    spinner.text = 'Loading changed files...';
    const filePaths = changedFilesData.files.map((f) => f.path);
    const filesResult = await loadFiles(filePaths);

    // Determine dependency depth
    let maxDepth;
    if (deep) {
      maxDepth = Infinity; // Unlimited depth for --deep
    } else if (depth !== undefined) {
      maxDepth = depth; // User-specified depth
    } else {
      maxDepth = config.dependency_depth || 2; // Config default
    }

    // Get dependencies
    const depthText = maxDepth === Infinity ? 'unlimited depth' : `depth ${maxDepth}`;
    spinner.text = `Analyzing dependencies (${depthText})...`;
    const dependencyPaths = await getDependencies(filePaths, maxDepth);
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

    // Calculate model counts from enabled providers (based on config)
    let localModels = 0;
    let apiModels = 0;
    let totalModels = 0;
    
    for (const provider of enabledProviders) {
      const modelCount = (provider.models || []).length;
      totalModels += modelCount;
      
      // ollama is local, everything else is API
      if (provider.name === 'ollama') {
        localModels += modelCount;
      } else {
        apiModels += modelCount;
      }
    }

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
    
    if (branchName !== undefined) {
      const targetBranch = branchName || 'current branch';
      info(`Reviewing branch '${targetBranch}' vs main with ${totalModels} LLM model(s)...\n`);
    } else if (sinceBranch) {
      info(`Reviewing commits since '${sinceBranch}' with ${totalModels} LLM model(s)...\n`);
    } else if (commitCount && commitCount > 1) {
      info(`Reviewing last ${commitCount} commits with ${totalModels} LLM model(s)...\n`);
    } else {
      info(`Reviewing with ${totalModels} LLM model(s)...\n`);
    }

    const reviewSpinner = createSpinner('Sending requests to models...');
    const results = await Promise.all(
      providers.map((provider) => provider.review(prompt))
    );
    reviewSpinner.stop();

    // Generate report
    const reportSpinner = createSpinner('Generating report...');
    const reportData = {
      commit: changedFilesData.commit,
      scanType,
      filesChanged: changedFilesData.files,
      providers: enabledProviders,
      results,
    };
    
    // Add multi-commit/branch specific data if applicable
    if (commitCount && commitCount > 1) {
      reportData.commits = changedFilesData.commits;
      reportData.commitCount = commitCount;
    } else if (branchName !== undefined || sinceBranch) {
      reportData.commits = changedFilesData.commits;
      reportData.commitCount = changedFilesData.commitCount;
      reportData.branchName = changedFilesData.branchName;
      reportData.baseBranch = changedFilesData.baseBranch;
    }
    
    const report = await generateAndSaveReport(
      reportData,
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
      localModels,
      apiModels,
      totalModels,
      successfulReviews,
      failedReviews: totalReviews - successfulReviews,
      reportPath: report.filePath,
    });

    // Exit with appropriate code
    if (successfulReviews === 0) {
      process.exit(1);
    }
    
    // Exit successfully
    process.exit(0);
  } catch (err) {
    if (spinner.isSpinning) {
      spinner.stop();
    }
    error(err.message);
    process.exit(1);
  }
}

module.exports = { fastScanCommand };

