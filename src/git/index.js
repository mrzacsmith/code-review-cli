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
  hasUncommittedChanges,
};

