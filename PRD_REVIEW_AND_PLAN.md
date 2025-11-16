# Code Review CLI (crc) - PRD Review & Implementation Plan

**Date:** 2025-01-27  
**Status:** Planning Phase

---

## Executive Summary

This document reviews the Product Requirements Document for the Code Review CLI tool and provides a detailed implementation plan, questions for clarification, and technical considerations.

---

## PRD Review

### Strengths

1. **Clear Workflow**: The core workflow (commit → analyze → review → report) is well-defined
2. **Flexible Provider Support**: Multi-provider architecture allows for diverse LLM usage
3. **Progressive Enhancement**: Fast vs Deep scan provides user choice between speed and thoroughness
4. **Good Separation of Concerns**: Configuration, rules, and reports are clearly separated

### Decisions Made

#### 1. **Git Commit Detection**
- **Decision**: `crc` (without flags) performs a fast scan of the latest commit
- **Decision**: Uncommitted changes are skipped (only committed code is reviewed)
- **Decision**: Tool is manually run by developer after making commits
- **Edge Case**: If no commits exist, show clear error message

#### 2. **Rules System**
- **Decision**: When loading `.cursorrules/` folder, concatenate all files with clear separators
- **Decision**: Rules treated as plain text (no parsing/validation)
- **Decision**: Keep rules short by convention, no hard limit initially (can add truncation later if needed)

#### 3. **Dependency Resolution**
- **Decision**: Start with 2 levels deep, make depth configurable in config file
- **Decision**: Load full file contents for transitive dependencies
- **Decision**: Detect and handle circular dependencies (skip already processed files)
- **Decision**: Automatically exclude `node_modules`, `vendor`, `.git`, build directories

#### 4. **Codebase Summary**
- **Decision**: Regenerate automatically if >7 days old on deep scan, or if missing
- **Decision**: Include file counts, basic project structure, key dependencies
- **Decision**: Keep architectural pattern detection simple initially (framework detection from package.json)

#### 5. **LLM Provider Configuration**
- **Decision**: `env:VARIABLE_NAME` reads from `process.env` only (no .env file loading in v1)
- **Decision**: Validate API keys before running reviews (fail fast)
- **Decision**: Basic retry logic with exponential backoff (3 retries max)

#### 6. **Parallel Execution**
- **Decision**: No limit on concurrent requests initially (can add if needed)
- **Decision**: Continue with successful models if some fail (graceful degradation)
- **Decision**: No request queuing in v1 (keep it simple)

#### 7. **Report Generation**
- **Decision**: Include processing time per model in reports
- **Decision**: Markdown format only in v1
- **Decision**: Reports overwrite if same commit (use timestamp in filename for uniqueness)

#### 8. **Error Handling**
- **Decision**: Clear error messages for all failure modes:
  - No models enabled → error with suggestion
  - All models fail → error with details
  - No git repo → error with instructions
  - Invalid config → error with validation details
- **Decision**: Exit code 0 if any model succeeds, 1 if all fail

#### 9. **Performance & Limits**
- **Decision**: Skip binary files (detect by extension and content)
- **Decision**: 10MB file size limit (skip larger files with warning)
- **Decision**: Handle large diffs by including full context (let LLM handle it)

#### 10. **Dependency Detection**
- **Decision**: Support JavaScript, TypeScript, Python, JSX/React initially
- **Decision**: Use AST parsing for JS/TS (`@babel/parser`), Python `ast` module, regex for JSX
- **Decision**: LLM should handle other languages, but we focus parsing on the above

---

## Technical Architecture Plan

### Phase 1: Foundation & Core Infrastructure

#### 1.1 Project Setup
- [ ] Initialize npm package with proper structure
- [ ] Configure ESLint/Prettier
- [ ] Set up testing framework (Jest)
- [ ] Create basic CLI structure with Commander.js
- [ ] Define JavaScript modules and data structures for config, providers, reports

#### 1.2 Configuration System
- [ ] Create config schema/validation (Joi or manual validation)
- [ ] Implement config loader with YAML parsing
- [ ] Environment variable resolution (`env:VAR_NAME` from process.env)
- [ ] Default config template generation
- [ ] Config validation and error messages

#### 1.3 Git Integration
- [ ] Integrate `simple-git` for git operations
- [ ] Implement latest commit detection and diff extraction
- [ ] Handle edge cases (no commits → error, uncommitted changes → skip)
- [ ] Extract file paths from diffs
- [ ] Get commit metadata (hash, message, author, date)

### Phase 2: Rules & Context Building

#### 2.1 Rules System
- [ ] Detect `.cursorrules` file or `.cursorrules/` folder
- [ ] Load and concatenate rules
- [ ] Handle missing rules gracefully
- [ ] Rules size validation/truncation logic

#### 2.2 File Content Loading
- [ ] Load full content of changed files
- [ ] Handle binary files (skip or mark)
- [ ] File encoding detection
- [ ] Large file handling (size limits)

#### 2.3 Dependency Detection (Fast Scan)
- [ ] Import/require statement detection
  - JavaScript/TypeScript: `@babel/parser`
  - Python: `ast` module (via child process)
  - JSX/React: `@babel/parser` with JSX plugin
- [ ] Resolve import paths to actual files
- [ ] Load direct dependency file contents
- [ ] Handle relative/absolute imports
- [ ] Support different module systems (ESM, CommonJS, Python)
- [ ] Skip binary files and files >10MB

#### 2.4 Codebase Summary (Deep Scan)
- [ ] Project type detection (package.json, requirements.txt, etc.)
- [ ] Dependency extraction from package files
- [ ] Directory structure analysis
- [ ] README parsing/summarization
- [ ] Pattern detection (framework, architecture)
- [ ] Summary caching with timestamp
- [ ] Auto-regeneration logic

#### 2.5 Transitive Dependencies (Deep Scan)
- [ ] Recursive dependency resolution
- [ ] Circular dependency detection and handling
- [ ] Configurable depth limiting (default: 2 levels)
- [ ] File exclusion patterns (node_modules, vendor, .git, build dirs)
- [ ] Aggregate dependency graph

### Phase 3: LLM Provider Integration

#### 3.1 Provider Abstraction Layer
- [ ] Define provider base class/interface
- [ ] Common error handling
- [ ] Request/response formatting
- [ ] Retry logic with exponential backoff (3 retries max)
- [ ] API key validation before requests

#### 3.2 Individual Provider Implementations
- [ ] **Ollama Provider**
  - HTTP client setup
  - Model listing/validation
  - Request formatting
  - Response parsing
- [ ] **OpenRouter Provider**
  - API key authentication
  - Model selection
  - Request formatting
  - Response parsing
- [ ] **OpenAI Provider**
  - SDK integration (`openai` package)
  - Model configuration
  - Response parsing
- [ ] **Anthropic Provider**
  - SDK integration (`@anthropic-ai/sdk`)
  - Model configuration
  - Response parsing

#### 3.3 Parallel Execution Engine
- [ ] Provider factory/registry
- [ ] Concurrent request management
- [ ] Progress tracking per provider
- [ ] Individual failure handling
- [ ] Timeout configuration
- [ ] Rate limiting awareness

#### 3.4 Prompt Engineering
- [ ] Template system for prompts
- [ ] Context assembly (rules + changes + dependencies)
- [ ] Token limit management
- [ ] Context truncation strategies
- [ ] Structured output format specification

### Phase 4: Reporting & Output

#### 4.1 Terminal Output
- [ ] Progress indicators (spinners with `ora`)
- [ ] Progress bars for long operations (`cli-progress`)
- [ ] Color-coded output (`chalk`)
- [ ] Real-time model status updates
- [ ] Summary statistics display

#### 4.2 Report Generation
- [ ] Markdown template system
- [ ] Report file naming convention: `{YYYY-MM-DD_HH-mm-ss}_{short-commit-hash}.md`
- [ ] Report directory management
- [ ] Report structure assembly
- [ ] Model response formatting
- [ ] Diff inclusion in report
- [ ] Metadata (timestamp, commit, scan type, processing time per model)

#### 4.3 Report Analysis
- [ ] Cross-model consensus detection
- [ ] Unique findings identification
- [ ] Severity aggregation
- [ ] Summary generation

### Phase 5: Commands Implementation

#### 5.1 `crc init`
- [ ] Create `.code-review.config` from template
- [ ] Create `.code-reviews/` directory
- [ ] Optional initial summary generation
- [ ] Interactive setup (optional)

#### 5.2 `crc` / `crc --fast`
- [ ] Fast scan workflow orchestration
- [ ] Get latest commit (skip uncommitted changes)
- [ ] Context building (diff + files + direct deps + rules)
- [ ] Parallel model execution
- [ ] Report generation
- [ ] Terminal output

#### 5.3 `crc --deep`
- [ ] Deep scan workflow orchestration
- [ ] Codebase summary loading/generation
- [ ] Transitive dependency resolution
- [ ] Extended context building
- [ ] Parallel model execution
- [ ] Enhanced report generation

#### 5.4 `crc summarize`
- [ ] Full codebase analysis
- [ ] Summary generation
- [ ] Cache management
- [ ] Progress feedback

#### 5.5 `crc --clean`
- [ ] Directory cleanup logic
- [ ] Confirmation prompt
- [ ] Preserve `.summary.json`
- [ ] Safety checks

### Phase 6: Error Handling & Validation

#### 6.1 Pre-flight Checks
- [ ] Git repository validation
- [ ] Commit existence check
- [ ] Config file validation
- [ ] API key presence validation
- [ ] Rules file existence
- [ ] Network connectivity (for remote APIs)

#### 6.2 Runtime Error Handling
- [ ] Model failure recovery (continue with other models)
- [ ] Network error retry logic (exponential backoff, 3 retries)
- [ ] Timeout handling (configurable per provider)
- [ ] Partial success scenarios (exit 0 if any model succeeds)
- [ ] Graceful degradation (show warnings for failed models)

#### 6.3 User Feedback
- [ ] Clear error messages with actionable suggestions
- [ ] Exit code standardization (0 = success, 1 = failure)
- [ ] Warning vs error distinction
- [ ] Progress indicators for all operations

### Phase 7: Testing & Polish

#### 7.1 Unit Tests
- [ ] Config parsing and validation
- [ ] Git operations
- [ ] Dependency detection
- [ ] Provider integrations (mocked)
- [ ] Report generation
- [ ] Rules loading

#### 7.2 Integration Tests
- [ ] End-to-end workflow tests
- [ ] Multi-provider scenarios
- [ ] Error condition tests
- [ ] Large diff handling

#### 7.3 Manual Testing
- [ ] Various project types
- [ ] Different commit sizes
- [ ] Multiple provider combinations
- [ ] Edge cases

#### 7.4 Documentation
- [ ] README with usage examples
- [ ] Configuration documentation
- [ ] Provider setup guides
- [ ] Troubleshooting guide
- [ ] Contributing guidelines

---

## Implementation Considerations

### Technology Choices

1. **CLI Framework**: Commander.js ✓ (as specified)
2. **Git Operations**: simple-git ✓ (as specified)
3. **Config Parsing**: js-yaml ✓ (as specified)
4. **Progress Display**: 
   - `ora` for spinners ✓
   - `cli-progress` for bars ✓
5. **Terminal Formatting**: `chalk` ✓
6. **LLM Clients**:
   - `axios` for HTTP-based providers ✓
   - `@anthropic-ai/sdk` for Anthropic ✓
   - `openai` package for OpenAI (recommended over axios)
7. **Dependency Parsing**:
   - `@babel/parser` for JS/TS/JSX (with JSX plugin)
   - Python `ast` module (via child process)
8. **Config Validation**: `joi` for runtime validation (JavaScript-friendly)
9. **File Operations**: Native `fs/promises` ✓
10. **Language**: JavaScript/Node.js only (no TypeScript)

### Architecture Patterns

1. **Provider Pattern**: Base class with concrete implementations (JavaScript classes)
2. **Strategy Pattern**: Different context building strategies (fast vs deep)
3. **Factory Pattern**: Provider instantiation
4. **Template Method**: Report generation pipeline
5. **Module Pattern**: ES6 modules for organization

### Performance Optimizations

1. **Lazy Loading**: Only load files when needed
2. **Caching**: Codebase summary, parsed dependencies
3. **Parallelization**: Model requests, file reading where possible
4. **Size Limits**: 
   - 10MB file size limit (skip larger files)
   - Skip binary files automatically
   - Configurable dependency depth (default: 2 levels)

### Security Considerations

1. **API Key Storage**: Never log or expose keys
2. **File System**: Validate paths, prevent directory traversal
3. **Git Operations**: Sanitize commit hashes
4. **Network**: Timeout configurations, retry limits

---

## Implementation Priority

### Phase 1: Basic CLI & Fast Scan (MVP)
**Goal**: Get a working fast scan with one provider as quickly as possible for testing

1. Basic CLI structure with `crc` command
2. Git integration (latest commit detection)
3. Rules loading
4. Single provider (Ollama first - easiest to test)
5. Basic report generation
6. Terminal output

### Phase 2: Multi-Provider & Parallel Execution
1. All provider implementations
2. Parallel execution engine
3. Progress indicators
4. Error handling

### Phase 3: Deep Scan Features
1. Codebase summary generation
2. Transitive dependency resolution
3. `crc summarize` command
4. `crc --deep` command

### Phase 4: Polish & Additional Commands
1. `crc init` command
2. `crc --clean` command
3. Enhanced error messages
4. Testing
5. Documentation

---

## Success Metrics

### Functional
- ✅ Successfully review commits with multiple models
- ✅ Generate readable markdown reports
- ✅ Complete fast scan in <30s (local models)
- ✅ Handle 100+ file changes without crashing
- ✅ Clear error messages for all failure modes
- ✅ Zero configuration required after `crc init`

### Technical
- ✅ Works offline with Ollama
- ✅ Supports Node 18+
- ✅ Cross-platform (macOS, Linux, Windows)
- ✅ Minimal dependencies
- ✅ Clear progress feedback
- ✅ Comprehensive error messages

---

## Risk Assessment

### High Risk
- **Dependency Resolution**: Complex, language-specific, edge cases
- **Multi-Provider Integration**: Different APIs, error handling, rate limits
- **Large Diff Handling**: Performance, token limits, context management

### Medium Risk
- **Rules System**: Edge cases with folder structure, size limits
- **Codebase Summary**: Pattern detection accuracy
- **Cross-Platform**: Windows path handling, line endings

### Low Risk
- **Git Operations**: Well-established library
- **CLI Framework**: Mature tooling
- **Report Generation**: Straightforward templating

---

## Next Steps

1. **Set up project structure** with JavaScript/Node.js
2. **Create initial project skeleton** with npm, ESLint, Jest
3. **Build basic CLI** with `crc` command (Phase 1 MVP)
4. **Implement fast scan** with single provider (Ollama) for early testing
5. **Iterate and expand** based on testing feedback

---

## Notes

- **Language Support**: JavaScript, TypeScript, Python, JSX/React initially. LLM should handle other languages, but we focus parsing on the above.
- **Dependency Depth**: Configurable in config file, default 2 levels
- **File Size Limit**: 10MB max, skip binary files
- **Commit Behavior**: `crc` with no flags = fast scan of latest commit, skip uncommitted changes
- **Technology**: JavaScript/Node.js only (no TypeScript)
- Consider creating a `docs/` folder for additional documentation
- May want to add a `examples/` folder for sample configs and reports
- Consider versioning the config file format for future compatibility

