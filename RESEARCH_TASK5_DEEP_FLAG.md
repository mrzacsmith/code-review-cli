# Task 5: Research `--deep` Flag - Deep Dependency Analysis

## Executive Summary

**Current State:** The codebase has a `dependency_depth` config option (default: 2, max: 5) that is **defined but NOT implemented**. The current `getDependencies()` function performs unlimited recursive dependency traversal, which is actually closer to "deep" than "fast".

**Key Finding:** The `--fast` scan is misleadingly named - it already does transitive dependency analysis! There is no true "shallow" mode that only looks at direct dependencies.

**Recommendation:** The `--deep` flag needs clarification. Three possible interpretations:
1. **Option A:** Make current behavior (unlimited depth) the "deep" mode, and implement true "fast" mode (depth 1)
2. **Option B:** Implement `dependency_depth` config to limit recursion depth, making "deep" mean unlimited
3. **Option C:** Remove `--deep` concept entirely since current behavior is already comprehensive

---

## Current Implementation Analysis

### Dependency Traversal Code

**File:** `src/dependencies/index.js` (lines 261-290)

```javascript
/**
 * Get all dependencies for a list of files (direct dependencies only)
 */
async function getDependencies(filePaths) {
  const dependencyMap = new Map();
  const processed = new Set();

  async function processFile(filePath) {
    if (processed.has(filePath)) {
      return; // Avoid circular dependencies
    }
    processed.add(filePath);

    const deps = await extractDependencies(filePath);
    for (const dep of deps) {
      if (dep.resolvedPath && !dependencyMap.has(dep.resolvedPath)) {
        dependencyMap.set(dep.resolvedPath, dep);
        // Recursively process dependencies (for direct deps only, so depth 1)
        await processFile(dep.resolvedPath);  // ⚠️ CONTRADICTION
      }
    }
  }

  for (const filePath of filePaths) {
    await processFile(filePath);
  }

  return Array.from(dependencyMap.keys());
}
```

**Analysis:**

1. **Comment says:** "direct dependencies only" and "depth 1"
2. **Code actually does:** Unlimited recursive traversal
3. **Circular dependency protection:** Uses `processed` Set to avoid infinite loops
4. **Result:** Returns ALL transitive dependencies, not just direct ones

### Example Dependency Graph

Given this structure:
```
A.js (changed file)
├─> B.js (direct dependency)
│   ├─> D.js (transitive, depth 2)
│   └─> E.js (transitive, depth 2)
│       └─> F.js (transitive, depth 3)
└─> C.js (direct dependency)
    └─> G.js (transitive, depth 2)
```

**Current behavior (despite "fast" naming):**
- Returns: `B.js`, `C.js`, `D.js`, `E.js`, `F.js`, `G.js` (all levels)
- Depth: Unlimited (until no more dependencies or circular)

**Expected "fast" behavior:**
- Should return: `B.js`, `C.js` (depth 1 only)

**Expected "deep" behavior:**
- Returns: All transitive dependencies (what current code already does!)

---

## Config Schema Analysis

### `dependency_depth` Configuration

**File:** `src/config/schema.js` (line 31)

```javascript
dependency_depth: Joi.number().integer().min(1).max(5).default(2),
```

**File:** `src/config/template.js` (line 38)

```yaml
dependency_depth: 2
```

**Observations:**

1. ✅ Config option exists
2. ✅ Validated with Joi schema
3. ✅ Merged in config loader
4. ❌ **NEVER ACTUALLY USED** in getDependencies()
5. ❌ No code checks this value anywhere

### Where It Should Be Used

The `getDependencies()` function should accept a `depth` parameter:

```javascript
async function getDependencies(filePaths, maxDepth = Infinity) {
  const dependencyMap = new Map();
  const processed = new Set();

  async function processFile(filePath, currentDepth) {
    if (currentDepth >= maxDepth) return;  // Stop at max depth
    if (processed.has(filePath)) return;
    processed.add(filePath);

    const deps = await extractDependencies(filePath);
    for (const dep of deps) {
      if (dep.resolvedPath && !dependencyMap.has(dep.resolvedPath)) {
        dependencyMap.set(dep.resolvedPath, dep);
        await processFile(dep.resolvedPath, currentDepth + 1);
      }
    }
  }

  for (const filePath of filePaths) {
    await processFile(filePath, 0);
  }

  return Array.from(dependencyMap.keys());
}
```

---

## Supported File Types

### JavaScript/TypeScript
- **Extensions:** `.js`, `.jsx`, `.ts`, `.tsx`
- **Parser:** Babel parser with AST traversal
- **Detects:**
  - ES6 imports: `import X from 'module'`
  - CommonJS require: `require('module')`
  - Dynamic imports (partially)
- **Fallback:** Regex-based extraction if parsing fails

### Python
- **Extension:** `.py`
- **Parser:** Python's `ast` module via subprocess
- **Detects:**
  - `import module`
  - `from module import X`
- **Fallback:** Regex-based extraction

### Unsupported Languages
Currently doesn't handle:
- Go (`import`)
- Rust (`use`, `mod`)
- Java (`import`)
- C/C++ (`#include`)
- PHP (`require`, `include`)

---

## Import Resolution Strategy

### Path Resolution Logic

**File:** `src/dependencies/index.js` (lines 176-220)

```javascript
async function resolveImportPath(importSource, fromFile) {
  // 1. Skip external packages (node_modules)
  if (!importSource.startsWith('.') && !path.isAbsolute(importSource)) {
    const nodeModulesPath = path.join(projectRoot, 'node_modules', importSource);
    try {
      await fs.access(nodeModulesPath);
      return null; // Skip node_modules
    } catch {}
  }

  // 2. Resolve relative/absolute paths
  const fromDir = path.dirname(fromFile);
  let resolved;

  if (path.isAbsolute(importSource)) {
    resolved = importSource;
  } else if (importSource.startsWith('.')) {
    resolved = path.resolve(fromDir, importSource);
  } else {
    resolved = path.resolve(fromDir, importSource);
  }

  // 3. Try different extensions
  const extensions = ['', '.js', '.jsx', '.ts', '.tsx', '.py', '/index.js', '/index.ts'];
  for (const ext of extensions) {
    const testPath = resolved + ext;
    try {
      const stat = await fs.stat(testPath);
      if (stat.isFile()) {
        return testPath;
      }
    } catch {}
  }

  return null;
}
```

### What Gets Included

✅ **Included:**
- Project-local files (relative imports like `./utils`)
- Absolute imports within project
- Index files (`import './folder'` → `./folder/index.js`)

❌ **Excluded:**
- `node_modules` packages (external dependencies)
- Built-in Node.js modules (`fs`, `path`, etc.)
- Missing files (broken imports)

---

## Performance Characteristics

### Current Behavior (Unlimited Depth)

**Test scenario:** React project with 50 changed files

```
Changed files: 50
Direct dependencies: ~150 files (3 deps per file avg)
Transitive dependencies (depth 2): ~450 files
Transitive dependencies (depth 3): ~1,350 files
Transitive dependencies (unlimited): ~3,000+ files
```

**Processing time:**
- File reading: ~50ms per file
- Import extraction: ~20ms per file
- Path resolution: ~10ms per import

**Total for unlimited depth:**
- 3,000 files × 80ms = 240 seconds (4 minutes) just for file processing
- LLM review of 3,000 files: Extremely expensive and slow
- Most files are likely irrelevant to the changes

### Depth-Limited Behavior

| Depth | Files Included | Processing Time | LLM Cost | Relevance |
|-------|---------------|----------------|----------|-----------|
| 1 (Direct) | ~150 | 12 seconds | $$ | High |
| 2 (Config default) | ~450 | 36 seconds | $$$ | Medium-High |
| 3 | ~1,350 | 108 seconds | $$$$ | Medium |
| Unlimited (Current) | ~3,000+ | 240+ seconds | $$$$$ | Low-Medium |

**Observation:** Diminishing returns after depth 2-3.

---

## "Fast" vs "Deep" Semantics

### Proposed Definitions

#### Fast Mode (Depth 1)
**Command:** `crc` or `crc --fast`

**Includes:**
- Changed files (from git diff)
- Direct dependencies of changed files (imports in changed files)

**Depth:** 1 level

**Use case:** Quick review of local changes and immediate dependencies

**Example:**
```
Changed: src/api/users.js
Direct deps:
  - src/utils/validation.js
  - src/models/User.js
  - src/middleware/auth.js
```

Result: 4 files reviewed

#### Configurable Mode (Config Default)
**Command:** `crc` (uses `dependency_depth` from config)

**Includes:**
- Changed files
- Dependencies up to configured depth (default: 2)

**Depth:** Configurable (1-5)

**Use case:** Balanced review depth for most projects

**Example with depth=2:**
```
Changed: src/api/users.js
Direct deps (depth 1):
  - src/utils/validation.js
  - src/models/User.js
Transitive deps (depth 2):
  - src/utils/validators/email.js
  - src/db/connection.js
```

Result: 5 files reviewed

#### Deep Mode (Unlimited)
**Command:** `crc --deep`

**Includes:**
- Changed files
- ALL transitive dependencies (unlimited depth)
- Stops only at: node_modules, circular deps, or non-existent files

**Depth:** Unlimited

**Use case:** Comprehensive review for critical changes (rare)

**Example:**
```
Changed: src/api/users.js
All dependencies:
  - Depth 1: src/utils/validation.js, src/models/User.js, ...
  - Depth 2: src/utils/validators/email.js, src/db/connection.js, ...
  - Depth 3: src/config/database.js, src/utils/logger.js, ...
  - Depth N: ...until no more deps
```

Result: Potentially hundreds of files

---

## Current Usage in fastScan

**File:** `src/commands/fastScan.js` (lines 126-129)

```javascript
// Get dependencies
spinner.text = 'Analyzing dependencies...';
const dependencyPaths = await getDependencies(filePaths);
const dependenciesResult = await loadFiles(dependencyPaths);
```

**Issues:**

1. ❌ No depth parameter passed
2. ❌ Config's `dependency_depth` is loaded but ignored
3. ❌ No way to control depth from CLI
4. ❌ Always does unlimited depth (slow, expensive)

---

## Proposed Implementation

### Option A: Implement Depth Control (Recommended)

**Changes needed:**

1. **Update `getDependencies()` signature:**
```javascript
async function getDependencies(filePaths, maxDepth = 2) {
  // ... implementation with depth tracking
}
```

2. **Use config value in fastScan:**
```javascript
const config = await loadConfig();
const maxDepth = options.deep ? Infinity : config.dependency_depth || 2;
const dependencyPaths = await getDependencies(filePaths, maxDepth);
```

3. **Add CLI flag:**
```javascript
.option('--deep', 'Deep scan with unlimited dependency depth')
.option('--depth <n>', 'Set dependency depth (1-5)', parseInt)
```

4. **Update CLI validation:**
```javascript
if (options.depth && (options.depth < 1 || options.depth > 5)) {
  console.error('Depth must be between 1 and 5');
  process.exit(1);
}
```

**Behavior:**
- `crc` → Uses config's `dependency_depth` (default: 2)
- `crc --depth 1` → Override to depth 1 (fast)
- `crc --depth 5` → Override to max depth 5
- `crc --deep` → Unlimited depth (ignores config)

### Option B: Three Modes (Simple)

**Changes needed:**

1. **Add mode flags:**
```javascript
.option('--fast', 'Fast scan with direct dependencies only (depth 1)')
.option('--deep', 'Deep scan with unlimited dependencies')
// Default: use config.dependency_depth
```

2. **Determine depth:**
```javascript
let maxDepth;
if (options.fast) {
  maxDepth = 1;
} else if (options.deep) {
  maxDepth = Infinity;
} else {
  maxDepth = config.dependency_depth || 2;
}
```

**Behavior:**
- `crc --fast` → Depth 1 only
- `crc` → Depth 2 (from config)
- `crc --deep` → Unlimited depth

### Option C: Make Deep the Default (Controversial)

Keep current unlimited behavior, rename flags:

- `crc` → Keep unlimited (current behavior)
- `crc --shallow` → Depth 1
- `crc --depth <n>` → Custom depth

**Pros:**
- No breaking changes (current behavior preserved)
- Users who want comprehensive review get it by default

**Cons:**
- Slow and expensive by default
- Wastes LLM tokens on irrelevant files
- Bad UX for large projects

---

## Circular Dependency Handling

### Current Protection

```javascript
const processed = new Set();

async function processFile(filePath) {
  if (processed.has(filePath)) {
    return; // Avoid circular dependencies
  }
  processed.add(filePath);
  // ...
}
```

**How it works:**

Given circular imports:
```
A.js → B.js → C.js → A.js (circular!)
```

**Traversal:**
1. Process A.js (add to `processed`)
2. Find dependency B.js, process it (add to `processed`)
3. Find dependency C.js, process it (add to `processed`)
4. Find dependency A.js, but it's in `processed` → skip

**Result:** All three files included, but no infinite loop.

**✅ This is correct!** Circular dependencies should all be included (they're all relevant).

---

## Edge Cases

### 1. Missing Files
**Scenario:** Import references non-existent file

```javascript
import { something } from './missing-file';  // File doesn't exist
```

**Current behavior:** `resolveImportPath()` returns `null`, dependency skipped

**Correct:** Yes, can't review a file that doesn't exist

### 2. Dynamic Imports
**Scenario:** Runtime-determined imports

```javascript
const moduleName = condition ? 'moduleA' : 'moduleB';
const module = require(moduleName);  // Dynamic
```

**Current behavior:** Not detected (only detects static string imports)

**Impact:** Misses some dependencies, but edge case

**Fix needed?** No - dynamic imports are rare in code review context

### 3. Monorepo Packages
**Scenario:** Import from different package in monorepo

```javascript
import { utils } from '@myapp/shared-utils';  // Different package
```

**Current behavior:** Skipped (treated as node_modules)

**Issue:** Might be project code, not external dependency

**Fix needed?** Yes, but complex - needs workspace detection

### 4. Aliased Imports
**Scenario:** Webpack aliases, tsconfig paths

```javascript
import { api } from '@/services/api';  // @ = src/
```

**Current behavior:** Won't resolve correctly

**Impact:** Misses aliased dependencies

**Fix needed?** Yes - should read tsconfig.json/webpack config for aliases

### 5. File Size Limits
**Scenario:** Dependency file is 100MB

**Current behavior:** `loadFile()` loads entire file into memory

**Issue:** Could cause OOM errors

**Fix needed?** Yes - add file size limit in deep scan

---

## Token Cost Analysis

### LLM Token Costs

Average file size: 200 lines × 40 chars/line = 8,000 chars = ~2,000 tokens

| Depth | Files | Tokens | Cost (GPT-4o-mini @ $0.15/1M) |
|-------|-------|--------|-------------------------------|
| 1 | 150 | 300K | $0.045 |
| 2 | 450 | 900K | $0.135 |
| 3 | 1,350 | 2.7M | $0.405 |
| Unlimited | 3,000 | 6M | $0.90 |

**Per commit cost comparison:**
- Fast (depth 1): $0.05
- Default (depth 2): $0.14
- Deep (unlimited): $0.90

**For 100 commits:**
- Fast: $5
- Default: $14
- Deep: $90

**Observation:** Deep mode is 18× more expensive than fast mode!

---

## Recommended Solution

### Implementation Plan

**Phase 1: Fix Current Behavior (CRITICAL)**

1. ✅ Implement depth parameter in `getDependencies()`
2. ✅ Use `config.dependency_depth` instead of unlimited
3. ✅ Add depth tracking to avoid scanning too deep
4. ✅ Default to depth 2 (config default)

**Result:** Makes current "fast" mode actually fast!

**Phase 2: Add CLI Control (HIGH PRIORITY)**

1. ✅ Add `--deep` flag for unlimited depth
2. ✅ Add `--depth <n>` flag for custom depth
3. ✅ Update help text explaining modes
4. ✅ Show depth info in spinner/output

**Result:** Users can control tradeoff between speed/cost and completeness

**Phase 3: Optimization (MEDIUM PRIORITY)**

1. ✅ Add file size limits (skip huge files)
2. ✅ Parallel dependency extraction
3. ✅ Cache import parsing results
4. ✅ Progress indicators for deep scans

**Result:** Faster, more reliable deep scans

**Phase 4: Enhanced Resolution (LOW PRIORITY)**

1. ✅ Support TypeScript path aliases
2. ✅ Support Webpack aliases
3. ✅ Monorepo workspace detection
4. ✅ More language support (Go, Rust, etc.)

**Result:** More accurate dependency detection

---

## Comparison Matrix: Fast vs Default vs Deep

| Aspect | Fast (depth 1) | Default (depth 2) | Deep (unlimited) |
|--------|---------------|------------------|------------------|
| **Command** | `crc --depth 1` | `crc` | `crc --deep` |
| **Dependencies** | Direct only | 2 levels | All transitive |
| **File count** | ~150 | ~450 | ~3,000 |
| **Processing time** | 10-15 sec | 30-40 sec | 3-5 min |
| **LLM tokens** | ~300K | ~900K | ~6M |
| **Cost per review** | $0.05 | $0.14 | $0.90 |
| **Accuracy** | High for local | Very High | Extremely High |
| **Use case** | Quick checks | Standard reviews | Critical changes |
| **Recommended for** | Daily commits | Feature branches | Releases, security |

---

## User Experience Design

### Output Messages

**Fast mode (depth 1):**
```
Analyzing dependencies (depth: 1 - direct only)...
✓ Found 12 changed files
✓ Found 34 direct dependencies
  Total files to review: 46
```

**Default mode (depth 2):**
```
Analyzing dependencies (depth: 2)...
✓ Found 12 changed files
✓ Found 34 direct dependencies
✓ Found 78 transitive dependencies (depth 2)
  Total files to review: 124
```

**Deep mode (unlimited):**
```
Analyzing dependencies (deep scan - unlimited depth)...
✓ Found 12 changed files
✓ Found 34 dependencies (depth 1)
✓ Found 78 dependencies (depth 2)
✓ Found 145 dependencies (depth 3)
✓ Found 234 dependencies (depth 4+)
  Total files to review: 503
⚠ Warning: Deep scan includes 500+ files
  This may be expensive and slow. Consider using --depth 2 for faster reviews.
```

### Configuration Examples

**Minimal config (use depth 1 by default):**
```yaml
dependency_depth: 1  # Fast reviews by default
```

**Balanced config (default):**
```yaml
dependency_depth: 2  # Good balance
```

**Thorough config (for critical codebases):**
```yaml
dependency_depth: 5  # Maximum depth short of unlimited
```

---

## Testing Plan

### Unit Tests

1. **Depth limiting:**
   - Test depth 1 only includes direct deps
   - Test depth 2 includes two levels
   - Test depth 5 stops at level 5
   - Test unlimited goes as deep as needed

2. **Circular dependencies:**
   - Test A→B→C→A circular doesn't cause infinite loop
   - Test all files in circle are included

3. **Missing files:**
   - Test broken imports are skipped
   - Test doesn't crash on missing files

### Integration Tests

1. **Real projects:**
   - Test on React app (many deps)
   - Test on Node API (fewer deps)
   - Test on monorepo (complex structure)

2. **Performance:**
   - Measure time for depth 1, 2, 5, unlimited
   - Ensure depth 1 is significantly faster than unlimited

### Manual Tests

```bash
# Test different depths
crc --depth 1          # Should be fast
crc                    # Should use config default
crc --depth 5          # Should take longer
crc --deep             # Should include everything

# Test config override
echo "dependency_depth: 1" >> .code-review.config
crc                    # Should use depth 1

# Test with different project types
cd react-project && crc --deep  # Lots of deps
cd api-project && crc --deep    # Fewer deps
```

---

## Documentation Updates

### README.md

Add to "Review Commands" section:

```markdown
### Dependency Depth Control

By default, code reviews include changed files plus 2 levels of dependencies. You can control this:

**Fast mode (direct dependencies only):**
```bash
crc --depth 1
```

**Custom depth (1-5 levels):**
```bash
crc --depth 3
```

**Deep mode (unlimited depth):**
```bash
crc --deep
```

**Note:** Deeper scans are more comprehensive but slower and more expensive (more LLM tokens).

**Configuration:**
Set default depth in `.code-review.config`:
```yaml
dependency_depth: 2  # 1-5, default is 2
```

**When to use:**
- `--depth 1`: Quick daily commit reviews
- Default (depth 2): Standard feature branch reviews
- `--depth 3-5`: Important changes with complex interactions
- `--deep`: Critical security updates, releases (rare)
```

### Help Command

Update help text:

```javascript
console.log(chalk.bold('\nDependency Depth:'));
console.log(`  ${chalk.green('crc --depth 1')}          Fast scan (direct deps only)`);
console.log(`  ${chalk.green('crc')}                    Default scan (depth 2 from config)`);
console.log(`  ${chalk.green('crc --depth 3')}          Custom depth (1-5)`);
console.log(`  ${chalk.green('crc --deep')}             Deep scan (unlimited depth)`);
console.log(`\n  ${chalk.dim('Note: Deeper = slower + more LLM tokens')}`);
```

---

## Conclusion

### Current State Summary

❌ **`--fast` is actually unlimited depth** (despite "fast" naming)

❌ **`dependency_depth` config exists but is unused**

❌ **No way to control depth from CLI**

✅ **Circular dependency protection works correctly**

✅ **Import extraction works for JS/TS/Python**

### Recommended Actions

**Must Have (Fix Breaking Behavior):**
1. Implement depth parameter in `getDependencies(filePaths, maxDepth)`
2. Use `config.dependency_depth` as default (value: 2)
3. Add depth tracking to stop at max depth

**Should Have (User Control):**
1. Add `--deep` flag for unlimited depth
2. Add `--depth <n>` flag for custom depth
3. Update documentation explaining tradeoffs

**Nice to Have (Future Enhancements):**
1. File size limits to prevent OOM
2. Progress indicators for deep scans
3. Parallel processing for speed
4. Support for more languages
5. TypeScript/Webpack alias resolution

### Final Recommendation

**DO NOT implement `--deep` as currently planned.** Instead:

1. **Fix the current behavior first** - make the default actually respect `dependency_depth`
2. **Add depth control** - let users choose between fast (1), balanced (2-3), or comprehensive (unlimited)
3. **Document the tradeoffs** - explain speed vs thoroughness vs cost
4. **Make depth 2 the default** - good balance for most use cases

**Effort:** Medium (core implementation + CLI + docs)

**Impact:** High (fixes performance issue, adds user control, reduces LLM costs)

**Risk:** Low (backwards compatible if we keep depth 2 as default)

---

## Files to Modify

### Core Implementation
1. **`src/dependencies/index.js`**
   - Add `maxDepth` parameter to `getDependencies()`
   - Add depth tracking in `processFile()`
   - Update exports

2. **`src/commands/fastScan.js`**
   - Get `dependency_depth` from config
   - Handle `--deep` and `--depth` flags
   - Pass depth to `getDependencies()`
   - Update spinner text to show depth

3. **`src/cli.js`**
   - Add `--deep` flag
   - Add `--depth <n>` flag
   - Add validation for depth value

### Documentation
4. **`README.md`**
   - Add dependency depth section
   - Explain fast/default/deep modes
   - Add performance/cost comparison
   - Add configuration examples

5. **`src/help/index.js`**
   - Add depth flags to help text
   - Explain when to use each mode

### Tests (if exists)
6. **`tests/dependencies/*.test.js`**
   - Test depth limiting
   - Test circular dependency handling
   - Test performance characteristics
