const simpleGit = require('simple-git');
const path = require('path');

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

  try {
    const commit = await getLatestCommit();
    const diff = await git.show([commit.hash, '--format=', '--']);
    return {
      commit,
      diff,
    };
  } catch (err) {
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
    const diffSummary = await git.diffSummary([`${commit.hash}^`, commit.hash]);

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
  getChangedFiles,
  hasUncommittedChanges,
};

