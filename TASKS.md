# Code Review CLI - Feature Tasks & Research

## Task 1: Add `crc show <provider>` Command
**Status:** ✅ COMPLETED
**Priority:** High
**Type:** Feature

### Description
Implement a `crc show <provider>` command to display available models for each LLM provider.

### Requirements
- `crc show anthropic` - List all available Anthropic Claude models
- `crc show openai` - List all available OpenAI models
- `crc show openrouter` - List all available OpenRouter models
- `crc show ollama` - Show locally installed Ollama models (already partially implemented in `crc doctor ollama`)

### Implementation Notes
- For API providers (Anthropic, OpenAI, OpenRouter): Query their APIs to get live model lists
- For Ollama: Use existing `/api/tags` endpoint to show installed models
- Display model names, descriptions, and availability status
- Show which models are currently configured in user's config

### Files to Modify/Create
- `src/commands/show.js` (new file)
- `src/cli.js` (add show command)
- Update help text in `src/help/index.js`

---

## Task 2: Dynamic Model Enable/Disable System
**Status:** Research & Design
**Priority:** Medium
**Type:** Research + Feature

### Research Questions
1. **UI/UX Approach:**
   - Interactive CLI menu (using `inquirer` or similar)?
   - Command-line flags (e.g., `crc config enable openai gpt-4o-mini`)?
   - Config file editor with validation?
   - Combination of multiple approaches?

2. **Config Management:**
   - How to handle project vs global config overrides?
   - Should enabling/disabling affect both `enabled` flag and `models` array?
   - How to preserve user's API keys when toggling providers?

3. **Validation:**
   - Should we validate model names against provider APIs before enabling?
   - How to handle invalid/deprecated model names?
   - Should we warn about cost implications when enabling expensive models?

### Proposed Options to Research
**Option A: Command-line Flags**
```bash
crc config enable openai gpt-4o-mini
crc config disable anthropic claude-sonnet-4-5
crc config provider enable openai
crc config provider disable ollama
```

**Option B: Interactive Menu**
```bash
crc config models
# Shows interactive menu to select/deselect models
```

**Option C: Direct Config Commands**
```bash
crc config add-model openai gpt-4o-mini
crc config remove-model openai gpt-4o-mini
crc config toggle-provider anthropic
```

### Deliverables
- Research document comparing options (pros/cons, user experience, implementation complexity)
- Recommended approach with rationale
- Detailed implementation plan
- Mockups of command output/interaction flow

---

## Task 3: Git Branch Review
**Status:** Pending
**Priority:** High
**Type:** Bug Fix / Enhancement

### Description
The `crc --branch` flag exists but needs verification and potential fixes.

### Current Implementation
- Located in `src/commands/fastScan.js` lines 87-93
- Uses `getBranchChangedFiles()` and `getBranchDiff()` from git module
- Reviews all commits on branch that aren't in main

### Tasks
1. **Verify Current Functionality:**
   - Test `crc --branch` (current branch vs main)
   - Test `crc --branch feature/auth` (specific branch vs main)
   - Document any bugs or issues

2. **Enhancements Needed:**
   - Support custom base branch (not just main)
   - Add `--base` flag: `crc --branch feature/auth --base develop`
   - Show branch comparison summary (X commits ahead of base)
   - Handle edge cases (branch doesn't exist, no differences, etc.)

3. **Documentation:**
   - Update README.md with branch review examples
   - Add help text for branch-related flags

### Files to Review/Modify
- `src/commands/fastScan.js`
- `src/git/index.js` (getBranchChangedFiles, getBranchDiff)
- `README.md`
- `src/help/index.js`

---

## Task 4: Fix `--since` Flag
**Status:** ✅ COMPLETED (No fixes needed - working correctly)
**Priority:** High
**Type:** Bug Fix / Documentation

### Description
The `--since` flag exists but may not be working correctly. Need to diagnose and fix.

### Current Implementation
- Located in `src/commands/fastScan.js` lines 94-99
- Uses `getChangedFilesSince()` and `getCommitsSince()` from git module
- Intended to review all commits since branching from specified branch

### Issues to Investigate
1. Does it correctly identify the branch point?
2. Does it handle multiple commits properly?
3. Does it work with different base branches (main, develop, etc.)?
4. How does it differ from `--branch` flag? (clarify use cases)

### Tasks
1. **Test Current Behavior:**
   - Test `crc --since main`
   - Test `crc --since develop`
   - Test on branches with merge commits
   - Document actual vs expected behavior

2. **Debug & Fix:**
   - Review git history traversal logic
   - Fix branch point detection if broken
   - Ensure all commits since branch point are included

3. **Add Tests:**
   - Unit tests for `getCommitsSince()`
   - Integration tests for `--since` flag

### Files to Review/Modify
- `src/commands/fastScan.js`
- `src/git/index.js` (getChangedFilesSince, getCommitsSince)
- Tests (if they exist)

---

## Task 5: Research & Document `--deep` Flag
**Status:** ✅ COMPLETED (Research document created)
**Priority:** Medium
**Type:** Research + Documentation

### Description
Research how the `--deep` scan will work and document the implementation approach. Do NOT implement code - just research and explain.

### Research Questions

1. **What is "Deep" Analysis?**
   - Current `--fast` scan: Reviews changed files + direct dependencies
   - `--deep` scan: Reviews changed files + ALL transitive dependencies
   - What is the difference in scope and performance?

2. **Dependency Analysis:**
   - How deep should dependency traversal go? (1 level, 2 levels, unlimited?)
   - How to handle circular dependencies?
   - How to limit scope to prevent reviewing entire codebase?
   - Should it follow `node_modules` or only project files?

3. **Performance Implications:**
   - How many files would typically be included in deep vs fast?
   - What's the expected time difference?
   - How to prevent timeouts with large dependency trees?
   - Should there be a max file limit?

4. **Current Implementation Status:**
   - Is there any existing code for `--deep`?
   - What's in `src/dependencies/index.js`?
   - Does `dependency_depth` config option already implement this?

5. **Use Cases:**
   - When would a user want `--deep` vs `--fast`?
   - What types of changes benefit from deep analysis?
   - Should it be the default for certain scenarios?

### Research Tasks

1. **Code Review:**
   - Read `src/dependencies/index.js` thoroughly
   - Read `src/commands/fastScan.js` to see current dependency handling
   - Check if `dependency_depth` config option is already implemented
   - Document current behavior vs intended behavior

2. **Analyze Current Dependency Depth:**
   - Test with `dependency_depth: 1` vs `dependency_depth: 2` in config
   - Document what actually happens at each depth level
   - Determine if `--deep` is just setting `dependency_depth: unlimited` or something different

3. **Design Considerations:**
   - How to visualize the dependency tree to users?
   - Should it show which files are direct vs transitive dependencies?
   - How to handle monorepo scenarios?
   - What about dependencies in different languages (TypeScript imports, Python imports, etc.)?

### Deliverables

Write a detailed research document explaining:

1. **Current State:**
   - What's already implemented
   - What works and what doesn't
   - Current dependency traversal algorithm

2. **Proposed `--deep` Behavior:**
   - Exactly what files would be included
   - How dependency traversal would work
   - Depth limits and stopping conditions
   - Performance characteristics

3. **Implementation Approach:**
   - High-level algorithm (pseudocode)
   - Data structures needed
   - Edge cases to handle
   - Performance optimizations

4. **User Experience:**
   - Command usage examples
   - Output format
   - Progress indicators for long scans
   - How to explain what's being scanned

5. **Comparison Matrix:**
   - `--fast` vs `--deep` side-by-side comparison
   - When to use each
   - Performance expectations
   - Cost implications (more LLM tokens for deeper scans)

### Files to Research
- `src/dependencies/index.js`
- `src/commands/fastScan.js`
- `src/config/schema.js` (dependency_depth option)
- `README.md` (current documentation)

---

## Summary

| Task | Priority | Type | Status |
|------|----------|------|--------|
| 1. `crc show <provider>` | High | Feature | ✅ COMPLETED |
| 2. Dynamic Model Toggle | Medium | Research + Feature | ✅ COMPLETED (Research) |
| 3. Git Branch Review | High | Bug Fix/Enhancement | ✅ COMPLETED |
| 4. Fix `--since` Flag | High | Bug Fix | ✅ COMPLETED |
| 5. Research `--deep` Flag | Medium | Research | ✅ COMPLETED |

---

## Notes

- Tasks 1, 3, 4 are implementation tasks (ready to code)
- Tasks 2, 5 are research tasks (need analysis before coding)
- All research tasks should produce written documents, not code
- Implementation should wait until after research is reviewed and approved
