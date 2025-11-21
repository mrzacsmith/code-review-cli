const simpleGit = require('simple-git');

/**
 * Get git instance for current working directory
 */
function getGit() {
  return simpleGit(process.cwd());
}

/**
 * Get the latest commit information
 */
async function getLatestCommit() {
  const git = getGit();

  try {
    const log = await git.log({ maxCount: 1 });
    if (log.total === 0) {
      throw new Error('No commits found in repository');
    }

    const commit = log.latest;
    return {
      hash: commit.hash,
      shortHash: commit.hash.substring(0, 7),
      message: commit.message,
      author: commit.author_name,
      date: commit.date,
    };
  } catch (err) {
    if (err.message.includes('not a git repository')) {
      throw new Error('Not a git repository. Please run this command in a git repository.');
    }
    throw err;
  }
}

/**
 * Get diff for the latest commit
 */
async function getLatestCommitDiff() {
  const git = getGit();
  const commit = await getLatestCommit();
  const diff = await git.show([commit.hash, '--format=', '--']);
  return {
    commit,
    diff,
  };
}

/**
 * Get combined diff for the last N commits
 */
async function getLastNCommitsDiff(commitCount) {
  const git = getGit();

  try {
    // Validate commit count
    if (!commitCount || commitCount < 1 || commitCount > 5) {
      throw new Error('Commit count must be between 1 and 5');
    }

    // Get the last N commits
    const log = await git.log({ maxCount: commitCount });
    if (log.total === 0) {
      throw new Error('No commits found in repository');
    }

    if (log.total < commitCount) {
      throw new Error(`Only ${log.total} commit(s) available, requested ${commitCount}`);
    }

    // Get commit information for all commits
    const commits = log.all.map(commit => ({
      hash: commit.hash,
      shortHash: commit.hash.substring(0, 7),
      message: commit.message,
      author: commit.author_name,
      date: commit.date,
    }));

    // Get combined diff from oldest to newest (HEAD~N..HEAD)
    const diff = await git.diff([`HEAD~${commitCount}`, 'HEAD']);

    // Create a summary commit object representing the range
    const latestCommit = commits[0]; // Most recent commit
    const oldestCommit = commits[commits.length - 1]; // Oldest commit in range
    
    const rangeCommit = {
      hash: `${oldestCommit.shortHash}..${latestCommit.shortHash}`,
      shortHash: `${oldestCommit.shortHash}..${latestCommit.shortHash}`,
      message: `Combined changes from ${commitCount} commit(s)`,
      author: latestCommit.author,
      date: latestCommit.date,
    };

    return {
      commit: rangeCommit,
      commits, // Individual commit details
      diff,
      commitCount,
    };
  } catch (err) {
    if (err.message.includes('not a git repository')) {
      throw new Error('Not a git repository. Please run this command in a git repository.');
    }
    throw err;
  }
}

/**
 * Get list of changed files in the latest commit
 */
async function getChangedFiles() {
  const git = getGit();

  try {
    const commit = await getLatestCommit();
    
    // Check if this is the first commit (no parent)
    const log = await git.log({ maxCount: 2 });
    const isFirstCommit = log.total === 1;
    
    let diffSummary;
    if (isFirstCommit) {
      // For first commit, compare against empty tree
      diffSummary = await git.diffSummary(['--root', commit.hash]);
    } else {
      diffSummary = await git.diffSummary([`${commit.hash}^`, commit.hash]);
    }

    const files = diffSummary.files.map((file) => ({
      path: file.file,
      insertions: file.insertions,
      deletions: file.deletions,
      changes: file.insertions + file.deletions,
    }));

    return {
      commit,
      files,
      totalInsertions: diffSummary.insertions,
      totalDeletions: diffSummary.deletions,
    };
  } catch (err) {
    if (err.message.includes('not a git repository')) {
      throw new Error('Not a git repository. Please run this command in a git repository.');
    }
    throw err;
  }
}

/**
 * Get list of changed files for the last N commits (combined)
 */
async function getLastNChangedFiles(commitCount) {
  const git = getGit();

  try {
    // Validate commit count
    if (!commitCount || commitCount < 1 || commitCount > 5) {
      throw new Error('Commit count must be between 1 and 5');
    }

    // Get the last N commits for commit info
    const log = await git.log({ maxCount: commitCount });
    if (log.total === 0) {
      throw new Error('No commits found in repository');
    }

    if (log.total < commitCount) {
      throw new Error(`Only ${log.total} commit(s) available, requested ${commitCount}`);
    }

    // Get combined diff summary for the range
    const diffSummary = await git.diffSummary([`HEAD~${commitCount}`, 'HEAD']);

    const files = diffSummary.files.map((file) => ({
      path: file.file,
      insertions: file.insertions,
      deletions: file.deletions,
      changes: file.insertions + file.deletions,
    }));

    // Create commit info for the range
    const commits = log.all.map(commit => ({
      hash: commit.hash,
      shortHash: commit.hash.substring(0, 7),
      message: commit.message,
      author: commit.author_name,
      date: commit.date,
    }));

    const latestCommit = commits[0];
    const oldestCommit = commits[commits.length - 1];
    
    const rangeCommit = {
      hash: `${oldestCommit.shortHash}..${latestCommit.shortHash}`,
      shortHash: `${oldestCommit.shortHash}..${latestCommit.shortHash}`,
      message: `Combined changes from ${commitCount} commit(s)`,
      author: latestCommit.author,
      date: latestCommit.date,
    };

    return {
      commit: rangeCommit,
      commits,
      files,
      totalInsertions: diffSummary.insertions,
      totalDeletions: diffSummary.deletions,
      commitCount,
    };
  } catch (err) {
    if (err.message.includes('not a git repository')) {
      throw new Error('Not a git repository. Please run this command in a git repository.');
    }
    throw err;
  }
}

/**
 * Get current branch name
 */
async function getCurrentBranch() {
  const git = getGit();
  
  try {
    const status = await git.status();
    return status.current;
  } catch (err) {
    if (err.message.includes('not a git repository')) {
      throw new Error('Not a git repository. Please run this command in a git repository.');
    }
    throw err;
  }
}

/**
 * Check if a branch exists
 */
async function branchExists(branchName) {
  const git = getGit();

  try {
    const branches = await git.branch(['-a']);
    // Check local and remote branches
    return branches.all.some(branch =>
      branch === branchName ||
      branch === `origin/${branchName}` ||
      branch.endsWith(`/${branchName}`)
    );
  } catch (err) {
    return false;
  }
}

/**
 * Get the default/base branch for the repository
 * Auto-detects from remote HEAD or falls back to common branch names
 */
async function getDefaultBranch() {
  const git = getGit();

  try {
    // Try to get remote's default branch from symbolic-ref
    try {
      const remote = await git.raw(['symbolic-ref', 'refs/remotes/origin/HEAD']);
      if (remote) {
        const branchName = remote.replace('refs/remotes/origin/', '').trim();
        if (branchName && await branchExists(branchName)) {
          return branchName;
        }
      }
    } catch {
      // symbolic-ref might fail if remote HEAD not set, continue to fallbacks
    }

    // Fall back to checking common default branch names
    const commonDefaults = ['main', 'master', 'develop', 'development'];

    for (const branchName of commonDefaults) {
      if (await branchExists(branchName)) {
        return branchName;
      }
    }

    // Last resort: return 'main' (will fail later with helpful error)
    return 'main';
  } catch (err) {
    // If all fails, default to 'main'
    return 'main';
  }
}

/**
 * Get branch diff (branch vs base branch)
 */
async function getBranchDiff(branchName, baseBranch = 'main') {
  const git = getGit();

  try {
    // If no branch name provided, use current branch
    const targetBranch = branchName || await getCurrentBranch();
    
    if (!targetBranch) {
      throw new Error('Could not determine current branch');
    }

    // Validate branches exist
    if (!(await branchExists(targetBranch))) {
      throw new Error(`Branch '${targetBranch}' does not exist`);
    }
    
    if (!(await branchExists(baseBranch))) {
      throw new Error(`Base branch '${baseBranch}' does not exist`);
    }

    // Get commits on the branch
    const log = await git.log([`${baseBranch}..${targetBranch}`]);
    if (log.total === 0) {
      throw new Error(`No commits found on '${targetBranch}' that are not in '${baseBranch}'`);
    }

    // Get combined diff
    const diff = await git.diff([baseBranch, targetBranch]);

    // Get commit information
    const commits = log.all.map(commit => ({
      hash: commit.hash,
      shortHash: commit.hash.substring(0, 7),
      message: commit.message,
      author: commit.author_name,
      date: commit.date,
    }));

    // Create summary commit object
    const latestCommit = commits[0];
    const oldestCommit = commits[commits.length - 1];
    
    const rangeCommit = {
      hash: `${baseBranch}..${targetBranch}`,
      shortHash: `${baseBranch}..${targetBranch}`,
      message: `Branch '${targetBranch}' vs '${baseBranch}' (${commits.length} commit${commits.length > 1 ? 's' : ''})`,
      author: latestCommit.author,
      date: latestCommit.date,
    };

    return {
      commit: rangeCommit,
      commits,
      diff,
      branchName: targetBranch,
      baseBranch,
      commitCount: commits.length,
    };
  } catch (err) {
    if (err.message.includes('not a git repository')) {
      throw new Error('Not a git repository. Please run this command in a git repository.');
    }
    throw err;
  }
}

/**
 * Get changed files for branch comparison
 */
async function getBranchChangedFiles(branchName, baseBranch = 'main') {
  const git = getGit();

  try {
    // If no branch name provided, use current branch
    const targetBranch = branchName || await getCurrentBranch();
    
    if (!targetBranch) {
      throw new Error('Could not determine current branch');
    }

    // Validate branches exist
    if (!(await branchExists(targetBranch))) {
      throw new Error(`Branch '${targetBranch}' does not exist`);
    }
    
    if (!(await branchExists(baseBranch))) {
      throw new Error(`Base branch '${baseBranch}' does not exist`);
    }

    // Get commits on the branch
    const log = await git.log([`${baseBranch}..${targetBranch}`]);
    if (log.total === 0) {
      throw new Error(`No commits found on '${targetBranch}' that are not in '${baseBranch}'`);
    }

    // Get diff summary
    const diffSummary = await git.diffSummary([baseBranch, targetBranch]);

    const files = diffSummary.files.map((file) => ({
      path: file.file,
      insertions: file.insertions,
      deletions: file.deletions,
      changes: file.insertions + file.deletions,
    }));

    // Get commit information
    const commits = log.all.map(commit => ({
      hash: commit.hash,
      shortHash: commit.hash.substring(0, 7),
      message: commit.message,
      author: commit.author_name,
      date: commit.date,
    }));

    // Create summary commit object
    const latestCommit = commits[0];
    
    const rangeCommit = {
      hash: `${baseBranch}..${targetBranch}`,
      shortHash: `${baseBranch}..${targetBranch}`,
      message: `Branch '${targetBranch}' vs '${baseBranch}' (${commits.length} commit${commits.length > 1 ? 's' : ''})`,
      author: latestCommit.author,
      date: latestCommit.date,
    };

    return {
      commit: rangeCommit,
      commits,
      files,
      totalInsertions: diffSummary.insertions,
      totalDeletions: diffSummary.deletions,
      branchName: targetBranch,
      baseBranch,
      commitCount: commits.length,
    };
  } catch (err) {
    if (err.message.includes('not a git repository')) {
      throw new Error('Not a git repository. Please run this command in a git repository.');
    }
    throw err;
  }
}

/**
 * Get commits since branching from specified branch (alias for getBranchDiff)
 */
async function getCommitsSince(baseBranch) {
  return getBranchDiff(null, baseBranch);
}

/**
 * Get changed files since branching from specified branch (alias for getBranchChangedFiles)
 */
async function getChangedFilesSince(baseBranch) {
  return getBranchChangedFiles(null, baseBranch);
}

/**
 * Check if there are uncommitted changes
 */
async function hasUncommittedChanges() {
  const git = getGit();

  try {
    const status = await git.status();
    return (
      status.files.length > 0 ||
      status.not_added.length > 0 ||
      status.created.length > 0 ||
      status.deleted.length > 0 ||
      status.modified.length > 0 ||
      status.renamed.length > 0
    );
  } catch (err) {
    return false;
  }
}

module.exports = {
  getGit,
  getLatestCommit,
  getLatestCommitDiff,
  getLastNCommitsDiff,
  getChangedFiles,
  getLastNChangedFiles,
  getCurrentBranch,
  branchExists,
  getDefaultBranch,
  getBranchDiff,
  getBranchChangedFiles,
  getCommitsSince,
  getChangedFilesSince,
  hasUncommittedChanges,
};

