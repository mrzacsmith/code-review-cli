# Task 3: Git Branch Review - Analysis & Enhancement Plan

## Current Implementation Analysis

### Code Review: `src/git/index.js`

#### `getBranchDiff()` - Lines 260-324
**Purpose:** Get diff between a branch and base branch (default: main)

**How it works:**
```javascript
// 1. Determine target branch (parameter or current branch)
const targetBranch = branchName || await getCurrentBranch();

// 2. Validate both branches exist
if (!(await branchExists(targetBranch))) { throw error }
if (!(await branchExists(baseBranch))) { throw error }

// 3. Get commits unique to target branch
const log = await git.log([`${baseBranch}..${targetBranch}`]);

// 4. Get combined diff
const diff = await git.diff([baseBranch, targetBranch]);
```

**Strengths:**
- ✅ Validates branches exist before diffing
- ✅ Handles current branch if no name provided
- ✅ Returns commit list and combined diff
- ✅ Creates descriptive summary commit object
- ✅ Works with local and remote branches

**Limitations:**
- ⚠️ Hardcoded base branch as `main` (parameter default)
- ⚠️ No auto-detection of actual base branch
- ⚠️ Assumes `main` exists (fails if project uses `master`, `develop`, etc.)

#### `getBranchChangedFiles()` - Lines 329-401
**Purpose:** Get list of files changed between branches

**How it works:**
```javascript
// Same validation as getBranchDiff
// Uses git.diffSummary() instead of git.diff()
const diffSummary = await git.diffSummary([baseBranch, targetBranch]);
```

**Strengths:**
- ✅ Returns file-level statistics (insertions, deletions)
- ✅ Consistent with getBranchDiff behavior

**Limitations:**
- ⚠️ Same hardcoded `main` base branch limitation

#### `getCommitsSince()` & `getChangedFilesSince()` - Lines 404-415
**Purpose:** Get commits/files since branching from specified branch

**How it works:**
```javascript
// Simple aliases
async function getCommitsSince(baseBranch) {
  return getBranchDiff(null, baseBranch);  // null = current branch
}
```

**Strengths:**
- ✅ Clean API - makes intent clear
- ✅ Allows custom base branch

**Analysis:**
- ✅ This is actually MORE flexible than `--branch`
- ✅ Already supports custom base branch
- ⚠️ Different from `--branch` flag semantics

---

## Current CLI Implementation

### `src/commands/fastScan.js` - Branch Handling

**Lines 87-93:**
```javascript
if (branchName !== undefined) {
  const targetBranch = branchName || 'current branch';
  spinner.text = `Analyzing branch '${targetBranch}' vs main...`;
  changedFilesData = await getBranchChangedFiles(branchName);
  diffData = await getBranchDiff(branchName);
  scanType = branchName ? `branch-${branchName}` : 'branch-current';
}
```

**Lines 94-99:**
```javascript
} else if (sinceBranch) {
  spinner.text = `Analyzing commits since '${sinceBranch}'...`;
  changedFilesData = await getChangedFilesSince(sinceBranch);
  diffData = await getCommitsSince(sinceBranch);
  scanType = `since-${sinceBranch}`;
}
```

**Issues Found:**
1. ❌ Both call functions with only 1 parameter, relying on default `baseBranch = 'main'`
2. ❌ No way to specify custom base branch
3. ❌ `--branch` and `--since` have different semantics but do almost the same thing:
   - `--branch feature/auth` → compares `feature/auth` vs `main`
   - `--since develop` → compares current branch vs `develop`

---

## Testing Scenarios & Results

### Scenario 1: `crc --branch` (current branch vs main)
**Expected:** Reviews all commits on current branch not in main
**Actual:** ✅ WORKS - Uses `getBranchChangedFiles(null)` which gets current branch
**Limitation:** Assumes `main` exists

### Scenario 2: `crc --branch feature/x` (specific branch vs main)
**Expected:** Reviews all commits on feature/x not in main
**Actual:** ✅ WORKS - Uses `getBranchChangedFiles('feature/x')`
**Limitation:** Assumes `main` exists

### Scenario 3: `crc --since develop` (current branch since develop)
**Expected:** Reviews commits since branching from develop
**Actual:** ✅ WORKS - Uses `getCommitsSince('develop')`
**Success:** Supports custom base branch!

### Scenario 4: Project uses `master` instead of `main`
**Expected:** Should work
**Actual:** ❌ FAILS - "Base branch 'main' does not exist"
**Problem:** Hardcoded `main` assumption

### Scenario 5: Project uses `develop` as main branch
**Expected:** Should work
**Actual:** ❌ FAILS - Can only use `--since develop`, not `--branch`

---

## Current Behavior Summary

| Command | Target Branch | Base Branch | Works? |
|---------|--------------|-------------|---------|
| `crc --branch` | Current | `main` (hardcoded) | ✅ If main exists |
| `crc --branch feature/x` | `feature/x` | `main` (hardcoded) | ✅ If main exists |
| `crc --since main` | Current | `main` | ✅ Always |
| `crc --since develop` | Current | `develop` | ✅ Always |
| `crc --branch --base develop` | Current | `develop` | ❌ Not supported |

**Observations:**
- `--since` is actually more flexible (accepts any base branch)
- `--branch` is limited (hardcoded to `main`)
- User confusion: Which flag to use when?

---

## Enhancement Plan

### Goal 1: Add `--base` Flag

Allow users to specify custom base branch for `--branch`:

```bash
# Current (limited)
crc --branch feature/auth  # Always compares to main

# Enhanced
crc --branch feature/auth --base develop
crc --branch --base develop  # Current branch vs develop
```

**Implementation:**
```javascript
// src/cli.js
.option('--branch [name]', 'Review branch vs base (current branch if no name)')
.option('--base <branch>', 'Base branch for comparison (default: main)')

// src/commands/fastScan.js
const baseBranch = options.base || 'main';
changedFilesData = await getBranchChangedFiles(branchName, baseBranch);
diffData = await getBranchDiff(branchName, baseBranch);
```

**Complexity:** Low - Just pass parameter through

---

### Goal 2: Auto-Detect Base Branch

Automatically detect the default branch from git config:

```javascript
async function getDefaultBranch() {
  const git = getGit();
  try {
    // Try to get remote's default branch
    const remote = await git.raw(['symbolic-ref', 'refs/remotes/origin/HEAD']);
    return remote.replace('refs/remotes/origin/', '').trim();
  } catch {
    // Fall back to common names
    if (await branchExists('main')) return 'main';
    if (await branchExists('master')) return 'master';
    if (await branchExists('develop')) return 'develop';
    return 'main'; // Last resort
  }
}
```

**Usage:**
```javascript
const baseBranch = options.base || await getDefaultBranch();
```

**Complexity:** Medium - Needs git queries, fallback logic

---

### Goal 3: Clarify `--branch` vs `--since`

**Current Confusion:**
- Both compare current branch to another branch
- Different semantics make choice unclear

**Proposed Clarification:**

| Flag | Target Branch | Base Branch | Use Case |
|------|--------------|-------------|----------|
| `--branch` | Can specify | Can specify with `--base` | "Review this branch" |
| `--since` | Always current | Required parameter | "Review since branching from X" |

**Examples:**
```bash
# Review a specific branch
crc --branch feature/auth --base develop

# Review current branch (two ways, same result)
crc --branch --base develop
crc --since develop

# Review current branch vs auto-detected base
crc --branch
```

**Recommendation:** Keep both for backwards compatibility, document the difference.

---

### Goal 4: Better Error Messages

**Current:**
```
Error: Base branch 'main' does not exist
```

**Enhanced:**
```
Error: Base branch 'main' does not exist

Your repository's branches:
  • master (default)
  • develop
  • feature/auth

Suggestions:
  • Use: crc --branch --base master
  • Use: crc --since master
  • Or set default: git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/master
```

---

### Goal 5: Show Branch Comparison Summary

When reviewing branches, show helpful context:

```
Branch Review Summary:
  Target: feature/auth
  Base: develop
  Commits ahead: 5
  Commits behind: 2
  Files changed: 12 (+245, -89)
```

---

## Implementation Checklist

### Phase 1: Add --base Flag (Priority: HIGH)
- [ ] Add `--base <branch>` option to CLI
- [ ] Pass `baseBranch` parameter to git functions
- [ ] Update help text
- [ ] Add validation (base branch must exist)
- [ ] Test with various base branches

### Phase 2: Auto-Detect Base (Priority: MEDIUM)
- [ ] Implement `getDefaultBranch()` function
- [ ] Add to `src/git/index.js`
- [ ] Use as default when `--base` not provided
- [ ] Test with main, master, develop

### Phase 3: Enhanced Output (Priority: LOW)
- [ ] Add branch comparison summary
- [ ] Show commits ahead/behind
- [ ] Improve error messages with suggestions
- [ ] Add to report metadata

### Phase 4: Documentation (Priority: HIGH)
- [ ] Update README with `--base` examples
- [ ] Clarify `--branch` vs `--since` differences
- [ ] Add troubleshooting section
- [ ] Update help command

---

## Files to Modify

### Core Implementation
1. **`src/cli.js`**
   - Add `--base <branch>` option
   - Pass to fastScanCommand

2. **`src/commands/fastScan.js`**
   - Accept `baseBranch` from options
   - Pass to git functions
   - Default to auto-detected base if not provided

3. **`src/git/index.js`**
   - Add `getDefaultBranch()` function
   - Export it

### Documentation
4. **`README.md`**
   - Document `--base` flag
   - Add examples for different base branches
   - Clarify `--branch` vs `--since`

5. **`src/help/index.js`**
   - Add `--base` to help text
   - Show examples

---

## Edge Cases to Handle

1. **Base branch doesn't exist**
   - Error message with suggestions
   - List available branches

2. **No commits difference**
   - "No commits found on X that aren't in Y"
   - Suggest checking if branches are equal

3. **Merge commits**
   - Should work (git log handles this)
   - Test to confirm

4. **Detached HEAD**
   - getCurrentBranch() returns null
   - Error message explaining state

5. **Brand new repo (no commits)**
   - Handle gracefully
   - "Repository has no commits"

---

## Backwards Compatibility

All changes are backwards compatible:
- ✅ `crc --branch` still works (uses auto-detected or main)
- ✅ `crc --branch feature/x` still works
- ✅ `crc --since develop` still works
- ✅ New `--base` flag is optional

---

## Recommended Solution

**Implement Phase 1 (--base flag) + Phase 2 (auto-detect) + Phase 4 (docs)**

This provides:
1. Immediate fix for users with non-main base branches
2. Auto-detection for better UX
3. Clear documentation to prevent confusion

**Skip Phase 3 for now** (enhanced output) - nice to have, not critical

---

## Testing Plan

### Manual Tests
1. Test `--branch` with no arguments (current branch vs auto-detected)
2. Test `--branch feature/x` with no --base (vs auto-detected)
3. Test `--branch feature/x --base develop`
4. Test `--branch --base master`
5. Test error case: base branch doesn't exist
6. Test error case: target branch doesn't exist
7. Test with merge commits
8. Test with main, master, and develop as base

### Automated Tests (Future)
- Unit tests for `getDefaultBranch()`
- Integration tests for branch review
- Edge case tests

---

## Final Recommendation

**Status: WORKING but LIMITED**

The `--branch` functionality works correctly but has a critical limitation: it's hardcoded to compare against `main`. This breaks for projects using `master`, `develop`, or other base branches.

**Recommended Fix:**
1. Add `--base <branch>` flag (MUST HAVE)
2. Implement auto-detection of default branch (NICE TO HAVE)
3. Update documentation (MUST HAVE)

**Effort:** Low to Medium
**Impact:** High (fixes real user pain point)
**Risk:** Low (backwards compatible)
