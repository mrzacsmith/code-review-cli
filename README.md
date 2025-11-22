# Code Review CLI (crc)

CLI tool for AI-powered code review of git commits using multiple LLM providers (Ollama, OpenRouter, OpenAI, Anthropic).

## Key Features

- **Terminal Headers** - Clear visual separation with colorful headers showing command context, version, and timing
- **Enhanced Help System** - Discoverable help with `crc help`, context-aware guidance, and live status display
- **Multi-Commit Reviews** - Review last N commits (`crc --commits 3`) or branch comparisons (`crc --branch`)
- **Smart Branch Detection** - Auto-detects base branch (main/master/develop) or specify with `--base`
- **Model Discovery** - Browse available models with `crc show <provider>` for easy configuration
- **Multiple LLM Providers** - Support for Ollama (local), OpenAI, Anthropic, and OpenRouter
- **Automatic Update Notifications** - Get notified when new versions are available with colorful alerts
- **Fast & Efficient** - Smart diff analysis focusing only on changed files
- **Detailed Reports** - Markdown reports with comprehensive analysis and suggestions
- **Context-Aware** - Understands your project structure and provides relevant feedback

## Installation

```bash
npm install -g @mrzacsmith/code-review-cli
```

### Update

To update to the latest version:

```bash
npm update -g @mrzacsmith/code-review-cli
```

## Quick Start

1. Initialize the project:
```bash
crc init
```

2. Add code-review files to .gitignore:
```bash
crc ignore
```

3. Set up global API keys (optional, for OpenAI/Anthropic/OpenRouter):
```bash
crc setup-global
```

4. Check your setup (optional):
```bash
crc doctor
# or for Ollama specifically to see installed models:
crc doctor ollama
```

5. Review your code:
```bash
crc                       # Review latest commit (depth 2 from config)
crc --commits 3           # Review last 3 commits
crc -n 2                  # Review last 2 commits
crc --branch              # Review current branch vs auto-detected base
crc --branch feature/auth # Review specific branch vs auto-detected base
crc --branch --base develop        # Review current branch vs develop
crc --branch feature/x --base main # Review feature/x vs main
crc --since main          # Review commits since branching from main
crc --depth 1             # Fast review (direct dependencies only)
crc --deep                # ⚠️ Comprehensive review (6-18× more expensive!)
```

**Note:** `--deep` scans ALL dependencies (unlimited depth) and can be significantly more expensive. Use the default (depth 2) for most reviews.

6. Get help anytime:
```bash
crc help                  # Enhanced help with colors and live status
crc doctor help           # Context-aware help for doctor command
crc config help           # Context-aware help for config command
```

## Commands

### Review Commands

- **`crc`** or **`crc --fast`** - Review latest commit (default)
  - Reviews changed files plus dependencies up to configured depth (default: 2)
  - Fast and efficient for quick feedback
  - Uses `dependency_depth` from config (default: 2 levels)

- **`crc --commits N`** or **`crc -n N`** - Review last N commits (1-5)
  - Reviews combined changes from the last N commits
  - Uses efficient combined diff approach
  - Examples: `crc --commits 3`, `crc -n 2`

- **`crc --branch [name]`** - Review branch vs base
  - Reviews all commits on branch that aren't in base branch
  - Auto-detects base branch (main, master, or develop)
  - Uses current branch if no name provided
  - Examples: `crc --branch`, `crc --branch feature/auth`
  - Use with `--base` to specify custom base branch

- **`crc --base <branch>`** - Specify base branch for comparison
  - Use with `--branch` to compare against custom base
  - Auto-detection tries: remote HEAD → main → master → develop
  - Examples: `crc --branch --base develop`, `crc --branch feature/x --base master`

- **`crc --since <branch>`** - Review commits since branching
  - Reviews all commits on current branch since branching from specified branch
  - Always reviews current branch (unlike `--branch` which can target any branch)
  - Examples: `crc --since main`, `crc --since develop`
  - **Note:** `crc --since X` is equivalent to `crc --branch --base X` when reviewing current branch

- **`crc --depth <n>`** - Custom dependency depth (1-5)
  - Override config to set specific dependency depth
  - Examples: `crc --depth 1` (direct only), `crc --depth 3` (3 levels)
  - Useful for controlling speed vs thoroughness tradeoff
  - ⚠️ **Higher depths = more LLM tokens = higher cost**

- **`crc --deep`** - Deep scan with unlimited dependencies
  - Reviews changed files and ALL transitive dependencies
  - More comprehensive but slower and more expensive
  - ⚠️ **WARNING: Can be 6-18× more expensive than default (depth 2)**
  - Use sparingly for critical changes, security reviews, or releases only

### Help Commands

- **`crc help`** - Enhanced help with colors and live status
  - Shows organized command sections with emoji icons
  - Displays real-time configuration and model availability
  - Provides contextual tips and guidance
  - Example: `crc help`

- **`crc <command> help`** - Context-aware help
  - Shows specific help for individual commands
  - Includes live status and available options
  - Examples: `crc doctor help`, `crc config help`

### Configuration Commands

- **`crc init`** - Initialize configuration and create `.code-review.config`
  - Creates a project-specific configuration file
  - Sets up default provider settings

- **`crc ignore`** - Add code-review files to `.gitignore`
  - Adds `.code-reviews/` and `.code-review.config` to `.gitignore`
  - Prevents committing user-specific configuration and reports

- **`crc doctor`** - Check provider status and configuration
  - General health check for all providers
  - Shows status of Ollama, OpenAI, Anthropic, and OpenRouter
  - Verifies API keys and configuration (basic checks only)

- **`crc doctor ollama`** - Check Ollama status and list installed models
  - Lists all installed Ollama models with exact names
  - Compares configured models vs installed models
  - Shows which models are found/missing
  - Suggests `ollama pull` commands for missing models
  - Helps find the correct model names for your config

- **`crc doctor ai`** - Test all AI providers with full connectivity
  - Tests OpenAI, Anthropic, and OpenRouter with actual API calls
  - Validates configured models are available
  - Performs small completion tests to verify functionality
  - Shows detailed connection status and error information

- **`crc doctor openai`** - Test OpenAI provider with full connectivity
  - Connects to OpenAI API and lists available models
  - Validates configured models exist
  - Tests completion functionality with minimal cost
  - Shows detailed error information for troubleshooting

- **`crc doctor anthropic`** - Test Anthropic provider with full connectivity
  - Connects to Anthropic API with actual test request
  - Validates configured models against known Anthropic models
  - Tests completion functionality with minimal cost
  - Shows detailed error information for troubleshooting

- **`crc doctor openrouter`** - Test OpenRouter provider with full connectivity
  - Connects to OpenRouter API and lists available models
  - Validates configured models exist
  - Tests completion functionality with gpt-4o-mini fallback
  - Shows detailed error information including credit status

- **`crc show <provider>`** - Show available models for a provider
  - Lists all available models for the specified provider
  - Shows which models are currently configured
  - Displays configuration status and API key status
  - Fetches live model lists from APIs (OpenAI, OpenRouter)
  - Shows locally installed models (Ollama)
  - Providers: `anthropic`, `openai`, `openrouter`, `ollama`
  - Examples: `crc show anthropic`, `crc show openai`

- **`crc setup-global`** - Set up global configuration file for API keys
  - Creates `~/.code-review-cli/config.yaml` for storing API keys
  - Useful for sharing API keys across multiple projects
  - API keys are stored in environment variable format: `env:API_KEY_NAME`

- **`crc config <global|project>`** - Manage configuration
  - View or edit global or project configuration files
  - Default action is `show` to display the config
  - Use `edit` action to modify the configuration
  - Use `upgrade` action to add new config options from latest version

**Actions:**
- `show` - Show configuration file (default)
- `edit` - Edit configuration file in your default editor
- `upgrade` - Upgrade config with new options (preserves your settings)

**Examples:**
```bash
crc config global         # Show global config
crc config project        # Show project config
crc config global edit    # Edit global config
crc config project edit   # Edit project config
crc config upgrade        # Upgrade project config with new options
crc config upgrade --global  # Upgrade global config with new options
```

**Note:** After updating CRC with `crc update`, run `crc config upgrade` to get new configuration options and comments in your existing configs.

### Prompt Management

- **`crc prompt show`** - Show current prompt template
  - Displays the prompt template being used for reviews
  - Shows whether using project or global template

- **`crc prompt edit`** - Edit prompt template
  - Opens the prompt template in your default editor
  - Supports project-specific or global templates
  - Use `--global` flag to edit global template

- **`crc prompt reset`** - Reset prompt template to default
  - Removes custom prompt and reverts to default
  - Use `--global` flag to reset global template

**Options:**
- `--global` - Use global prompt template instead of project-specific

**Examples:**
```bash
crc prompt show              # Show project prompt
crc prompt show --global     # Show global prompt
crc prompt edit              # Edit project prompt
crc prompt edit --global     # Edit global prompt
crc prompt reset             # Reset project prompt to default
```

### Report Management

- **`crc clear`** - Remove all code review reports
  - Deletes all `.md` report files from the reports directory
  - Helps keep the reports directory from getting too large
  - Safe to run - only deletes report files

- **`crc update`** - Update to the latest version
  - Checks npm registry for the latest version
  - Automatically updates the CLI if a new version is available
  - Shows current and new version information

- **`crc summarize`** - Generate codebase summary (coming soon)
  - Creates a summary of the entire codebase for context

## Configuration

### Project Configuration

Configuration is stored in `.code-review.config` (YAML format) in your project root.

**Example configuration:**
```yaml
providers:
  ollama:
    enabled: true
    base_url: http://localhost:11434
    models:
      - codellama:7b
      - deepseek-coder:latest
    max_tokens: 3000  # Optional: Maximum tokens for model response (default: 3000)
    temperature: 0.7  # Optional: Sampling temperature 0-2 (default: 0.7)

  openai:
    enabled: true
    api_key: env:OPENAI_API_KEY
    models:
      - gpt-4o-mini
    max_tokens: 3000  # Optional: Maximum tokens for model response (default: 3000)
    temperature: 0.7  # Optional: Sampling temperature 0-2 (default: 0.7)
    # Note: GPT-5, o1, o3 models do not support custom temperature

  anthropic:
    enabled: false
    api_key: env:ANTHROPIC_API_KEY
    models:
      - claude-sonnet-4-5
    max_tokens: 3000  # Optional: Maximum tokens for model response (default: 3000)
    temperature: 0.7  # Optional: Sampling temperature 0-2 (default: 0.7)

  openrouter:
    enabled: false
    api_key: env:OPENROUTER_API_KEY
    models:
      - anthropic/claude-sonnet-4
    max_tokens: 3000  # Optional: Maximum tokens for model response (default: 3000)
    temperature: 0.7  # Optional: Sampling temperature 0-2 (default: 0.7)

output:
  reports_dir: .code-reviews
  format: markdown

rules_file: .cursorrules
dependency_depth: 2
```

### Global Configuration

Global configuration is stored in `~/.code-review-cli/config.yaml` and is merged with project configuration (project settings take precedence).

### Max Tokens Configuration

Control the maximum number of tokens the LLM can generate in its response. This affects review length and API costs.

**Configuration (`max_tokens` per provider):**
```yaml
providers:
  openai:
    enabled: true
    api_key: env:OPENAI_API_KEY
    models:
      - gpt-4o-mini
    max_tokens: 3000  # Default: 3000 (range: 1-100000)
```

**When to adjust:**
- **Lower values (1000-2000)**: Quick, concise reviews - faster and cheaper
- **Default (3000)**: Balanced reviews with good detail - **RECOMMENDED**
- **Higher values (4000-8000)**: Comprehensive, detailed reviews - slower and more expensive
- **Very high (8000+)**: Extremely detailed analysis - use sparingly for complex changes

**Note:**
- Different models have different token limits (e.g., GPT-4 supports up to 128k, Claude supports up to 200k)
- Higher `max_tokens` increases API costs linearly
- This setting can be configured globally or per-project (project settings take precedence)
- For GPT-5 and newer models (o1, o3), the system automatically uses `max_completion_tokens` instead of `max_tokens`

### Temperature Configuration

Control the randomness/creativity of model responses. Lower values make output more focused and deterministic.

**Configuration (`temperature` per provider):**
```yaml
providers:
  openai:
    enabled: true
    api_key: env:OPENAI_API_KEY
    models:
      - gpt-4o-mini
    temperature: 0.7  # Default: 0.7 (range: 0-2)
```

**When to adjust:**
- **0.0-0.3**: Very focused, deterministic - good for consistent, factual reviews
- **0.4-0.7**: Balanced (default) - **RECOMMENDED** for most code reviews
- **0.8-1.2**: More creative - useful for brainstorming improvements
- **1.3-2.0**: Very creative - rarely needed for code review

**Important Notes:**
- **GPT-5, o1, and o3 models do NOT support custom temperature** - they use a fixed temperature of 1.0
- The system automatically omits the temperature parameter for these models
- This setting can be configured globally or per-project (project settings take precedence)
- See `MODEL_COMPATIBILITY.md` for detailed model-specific parameter support

### Dependency Depth Control

Control how many levels of dependencies are analyzed during code review:

**Configuration (`dependency_depth` in `.code-review.config`):**
```yaml
dependency_depth: 2  # Default: 2 levels (1-5)
```

**CLI Override:**
```bash
crc --depth 1    # Fast: direct dependencies only
crc              # Default: uses config (depth 2)
crc --depth 3    # Moderate: 3 levels of dependencies
crc --deep       # Comprehensive: unlimited depth
```

**When to use:**
- `--depth 1`: Quick daily commit reviews (~150 files, fast, low cost)
- Default (depth 2): Standard feature reviews (~450 files, balanced) - **RECOMMENDED**
- `--depth 3-5`: Complex changes with interactions (~1000+ files, thorough, **2-5× more expensive**)
- `--deep`: Critical security/release reviews (thousands of files, **6-18× more expensive**)

**⚠️ COST WARNING:** Deeper scans process more files and use significantly more LLM tokens:
- Depth 1: ~$0.05 per review (150 files)
- Depth 2: ~$0.14 per review (450 files) ← Default
- Depth 3: ~$0.30 per review (1,000 files)
- `--deep`: ~$0.90+ per review (3,000+ files)

Use `--deep` sparingly - it can cost 6-18× more than the default!

### Environment Variables

Set API keys as environment variables:
```bash
export OPENAI_API_KEY="your-key-here"
export ANTHROPIC_API_KEY="your-key-here"
export OPENROUTER_API_KEY="your-key-here"
```

Then reference them in config as `env:VARIABLE_NAME`.

### Provider Setup

#### Ollama (Local)
1. Install Ollama: https://ollama.ai
2. Pull models: `ollama pull codellama:7b`
3. Start Ollama: `ollama serve`
4. Enable in config with `enabled: true`

#### OpenAI
1. Get API key from https://platform.openai.com
2. Set environment variable: `export OPENAI_API_KEY="sk-..."`
3. Enable in config with `enabled: true`

#### Anthropic
1. Get API key from https://console.anthropic.com
2. Set environment variable: `export ANTHROPIC_API_KEY="sk-ant-..."`
3. Enable in config with `enabled: true`

#### OpenRouter
1. Get API key from https://openrouter.ai
2. Set environment variable: `export OPENROUTER_API_KEY="sk-or-..."`
3. Enable in config with `enabled: true`

## Reports

Reports are saved in `.code-reviews/` directory (configurable) with the format:
```
{date}_{commit-hash}_{scan-type}.md
```

Each report includes:
- Commit information (hash, message, author)
- Files changed summary
- Reviews from each enabled model
- Processing time and success/failure status

## Requirements

- Node.js 18+
- Git repository
- At least one enabled LLM provider

## Troubleshooting

### Branch Review Issues

**Error: "No commits found on 'X' that are not in 'Y'"**

This means the branches are identical (no new commits to review). Common causes:
- You're on the same branch as the base branch (e.g., `crc --since main` while on `main`)
- Your feature branch is fully merged into the base branch
- Your branch is behind the base branch (no new commits)

**Solution:** Check that you're on a feature branch with commits not in the base branch.

**Error: "Branch 'X' does not exist"**

The specified branch name doesn't exist in your repository.

**Solutions:**
- Check branch name spelling: `git branch -a`
- Fetch from remote if needed: `git fetch`
- For `--branch` without `--base`, ensure your repo has one of: `main`, `master`, or `develop`

### Understanding `--branch` vs `--since`

Both flags review branch differences, but with different defaults:

**Use `--since` when:**
- Always reviewing current branch
- Want to specify base branch explicitly
- Mental model: "show me changes since I branched from main"

```bash
crc --since main       # Current branch vs main
crc --since develop    # Current branch vs develop
```

**Use `--branch` when:**
- Want to review a specific branch (not current)
- Want automatic base branch detection
- Mental model: "review this feature branch"

```bash
crc --branch feature/auth              # feature/auth vs auto-detected base
crc --branch feature/auth --base main  # feature/auth vs main
crc --branch                           # Current branch vs auto-detected base
```

**Note:** `crc --since X` is equivalent to `crc --branch --base X` when on current branch.

## Coming Soon

The following features are planned for future releases:

- **`crc summarize`** - Generate codebase summary
  - Creates a summary of the entire codebase for context
  - Useful for providing background information to LLM models

- **`crc --clean`** - Clean report directory
  - Advanced report management with filtering options
  - Selective cleanup based on date, commit, or other criteria

## License

MIT
