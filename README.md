# Code Review CLI (crc)

CLI tool for AI-powered code review of git commits using multiple LLM providers (Ollama, OpenRouter, OpenAI, Anthropic).

## ✨ Key Features

- 🚀 **Beautiful Terminal Headers** - Clear visual separation with colorful headers showing command context, version, and timing
- ❓ **Enhanced Help System** - Discoverable help with `crc help`, context-aware guidance, and live status display
- 🔄 **Multi-Commit Reviews** - Review last N commits (`crc --commits 3`) or branch comparisons (`crc --branch`)
- 🤖 **Multiple LLM Providers** - Support for Ollama (local), OpenAI, Anthropic, and OpenRouter
- ⚡ **Fast & Efficient** - Smart diff analysis focusing only on changed files
- 📊 **Detailed Reports** - Markdown reports with comprehensive analysis and suggestions
- 🎯 **Context-Aware** - Understands your project structure and provides relevant feedback

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
crc                       # Review latest commit
crc --commits 3           # Review last 3 commits
crc -n 2                  # Review last 2 commits
crc --branch              # Review current branch vs main
crc --branch feature/auth # Review specific branch vs main
crc --since main          # Review commits since branching from main
```

6. Get help anytime:
```bash
crc help                  # Enhanced help with colors and live status
crc doctor help           # Context-aware help for doctor command
crc config help           # Context-aware help for config command
```

## Commands

### Review Commands

- **`crc`** or **`crc --fast`** - Fast scan of latest commit (default)
  - Reviews only changed files and their direct dependencies
  - Fast and efficient for quick feedback

- **`crc --commits N`** or **`crc -n N`** - Review last N commits (1-5)
  - Reviews combined changes from the last N commits
  - Uses efficient combined diff approach
  - Examples: `crc --commits 3`, `crc -n 2`

- **`crc --branch [name]`** - Review branch vs main
  - Reviews all commits on branch that aren't in main
  - Uses current branch if no name provided
  - Examples: `crc --branch`, `crc --branch feature/auth`

- **`crc --since <branch>`** - Review commits since branching
  - Reviews all commits since branching from specified branch
  - Example: `crc --since main`

- **`crc --deep`** - Deep scan with transitive dependencies
  - Reviews changed files and all transitive dependencies
  - More comprehensive but slower (coming soon)

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

- **`crc setup-global`** - Set up global configuration file for API keys
  - Creates `~/.code-review-cli/config.yaml` for storing API keys
  - Useful for sharing API keys across multiple projects
  - API keys are stored in environment variable format: `env:API_KEY_NAME`

- **`crc config <global|project>`** - Manage configuration
  - View or edit global or project configuration files
  - Default action is `show` to display the config
  - Use `edit` action to modify the configuration

**Actions:**
- `show` - Show configuration file (default)
- `edit` - Edit configuration file in your default editor

**Examples:**
```bash
crc config global        # Show global config
crc config project       # Show project config
crc config global edit    # Edit global config
crc config project edit   # Edit project config
```

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

  openai:
    enabled: true
    api_key: env:OPENAI_API_KEY
    models:
      - gpt-4o-mini

  anthropic:
    enabled: false
    api_key: env:ANTHROPIC_API_KEY
    models:
      - claude-sonnet-4-5

  openrouter:
    enabled: false
    api_key: env:OPENROUTER_API_KEY
    models:
      - anthropic/claude-sonnet-4

output:
  reports_dir: .code-reviews
  format: markdown

rules_file: .cursorrules
dependency_depth: 2
```

### Global Configuration

Global configuration is stored in `~/.code-review-cli/config.yaml` and is merged with project configuration (project settings take precedence).

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

## Coming Soon

The following features are planned for future releases:

- **`crc --deep`** - Deep scan with transitive dependencies
  - Reviews changed files and all transitive dependencies
  - More comprehensive analysis but slower execution

- **`crc summarize`** - Generate codebase summary
  - Creates a summary of the entire codebase for context
  - Useful for providing background information to LLM models

- **`crc --clean`** - Clean report directory
  - Advanced report management with filtering options
  - Selective cleanup based on date, commit, or other criteria

## License

MIT
