# Multi-Commit Review Feature Plan

## Overview

Add support for reviewing multiple commits and branch comparisons using efficient combined diff approaches. This expands CRC from single-commit reviews to comprehensive multi-commit analysis.

## Feature Set

### Phase 1: Last N Commits
- **`crc`** - Current behavior (last commit)
- **`crc --commits 3`** - Last 3 commits (limit: 1-5)
- **`crc -n 3`** - Short alias for `--commits`

### Phase 2: Branch Comparisons  
- **`crc --branch`** - All commits on current branch vs main
- **`crc --branch feature/auth`** - All commits on specific branch vs main
- **`crc --since main`** - All commits since branching from main

## Technical Implementation

### Combined Diff Approach
All features use **single combined diffs** rather than individual commit processing:

**Last N Commits:**
- `git diff HEAD~N..HEAD` - Combined diff of last N commits
- Single API call per model, one report file

**Branch Comparisons:**
- `git diff main..HEAD` - Combined diff of entire branch
- `git diff main..feature/auth` - Combined diff of specific branch
- Single API call per model, one report file

### Git Commands Required
```bash
# Last N commits
git log --oneline -n N --format="%H %s"
git diff HEAD~N..HEAD

# Branch comparisons
git merge-base main HEAD  # Find branch point
git diff main..HEAD       # Current branch vs main
git diff main..feature/auth  # Specific branch vs main
git log main..HEAD --oneline  # Get commit list for report
```

### Report Format Updates

**Multi-Commit Header:**
```markdown
**Commits Reviewed**: 3 (HEAD~3..HEAD)
- abc1234: Fix user authentication bug
- def5678: Add password validation  
- ghi9012: Update login UI

**Files Changed**: 5
**Total Changes**: +45, -12
```

**Branch Comparison Header:**
```markdown
**Branch**: feature/auth vs main
**Commits**: 8
- abc1234: Add OAuth integration
- def5678: Update user model
- [... 6 more commits]

**Files Changed**: 12
**Total Changes**: +234, -67
```

## Code Changes Required

### 1. CLI Updates (`src/cli.js`)
```javascript
program
  .option('--commits <n>', 'Review last N commits (1-5)', parseInt)
  .option('-n <n>', 'Short alias for --commits', parseInt)
  .option('--branch [name]', 'Review branch vs main (current branch if no name)')
  .option('--since <branch>', 'Review commits since branching from specified branch')
```

### 2. Git Module Updates (`src/git/index.js`)
- `getLastNCommitsDiff(n)` - Get combined diff for last N commits
- `getBranchDiff(branchName, baseBranch)` - Get branch comparison diff
- `getCommitsSince(baseBranch)` - Get commits since branching
- `validateBranchExists(branchName)` - Branch validation

### 3. FastScan Updates (`src/commands/fastScan.js`)
- Parse new CLI options
- Route to appropriate git diff function
- Update commit info for multi-commit scenarios
- Validate commit count limits (1-5)

### 4. Reports Updates (`src/reports/index.js`)
- Support multi-commit headers
- Display commit lists in reports
- Handle branch comparison metadata

## Configuration Updates

### Schema (`src/config/schema.js`)
```javascript
multi_commit: Joi.object({
  max_commits: Joi.number().min(1).max(5).default(5),
  default_base_branch: Joi.string().default('main')
}).default()
```

### Template (`src/config/template.js`)
```yaml
multi_commit:
  max_commits: 5
  default_base_branch: main
```

## Error Handling

### Validation
- Commit count must be 1-5
- Branch names must exist
- Base branch must exist
- Handle detached HEAD state
- Handle repositories with no commits

### User-Friendly Messages
- "Branch 'feature/xyz' not found"
- "No commits found since 'main'"
- "Commit count must be between 1 and 5"
- "Repository has no commit history"

## File Updates

### Add to `.npmignore`
```
# Planning documents
MULTI_COMMIT_PLAN.md
```

### Documentation Updates
- Update README.md with new commands
- Add examples to help text
- Update "Coming Soon" section

## Testing Strategy

### Git Scenarios
- Repository with 1 commit (edge case)
- Repository with 100+ commits
- Feature branch with merge commits
- Detached HEAD state
- Non-existent branches

### Command Validation
- `crc --commits 0` (should error)
- `crc --commits 10` (should error)  
- `crc --branch nonexistent` (should error)
- `crc --since nonexistent` (should error)

## Rollout Plan

### Version 0.2.0 (Next Release)
**Phase 1: Last N Commits**
- `--commits N` and `-n N` flags
- Combined diff implementation
- Updated reports
- Documentation updates

### Version 0.2.1 (Follow-up)
**Phase 2: Branch Comparisons**
- `--branch` and `--since` flags
- Branch validation
- Enhanced error handling
- Configuration options

## Benefits

### User Value
- **PR Preparation**: Review entire feature branches before creating PRs
- **Work Session Review**: Check last few commits before end of day
- **Branch Comparison**: See net changes vs main branch
- **Context Preservation**: Understand how changes relate across commits

### Technical Benefits
- **Efficient**: Single API calls vs multiple sequential calls
- **Cost Effective**: Lower token usage than individual commit reviews
- **Fast**: Parallel model execution, no commit iteration overhead
- **Simple**: Reuses existing review pipeline with minimal changes

This approach provides maximum user value with minimal complexity, following the proven pattern of the existing single-commit review system.
