const {
  getLatestCommit,
  getChangedFiles,
  hasUncommittedChanges,
} = require('../../src/git');

describe('Git Integration', () => {
  test('should get latest commit', async () => {
    const commit = await getLatestCommit();
    expect(commit).toHaveProperty('hash');
    expect(commit).toHaveProperty('shortHash');
    expect(commit).toHaveProperty('message');
    expect(commit).toHaveProperty('author');
  });

  test('should get changed files', async () => {
    const result = await getChangedFiles();
    expect(result).toHaveProperty('commit');
    expect(result).toHaveProperty('files');
    expect(Array.isArray(result.files)).toBe(true);
  });

  test('should check for uncommitted changes', async () => {
    const hasChanges = await hasUncommittedChanges();
    expect(typeof hasChanges).toBe('boolean');
  });
});

