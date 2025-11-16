# Code Review CLI (crc)

CLI tool for AI-powered code review of git commits using multiple LLM providers (Ollama, OpenRouter, OpenAI, Anthropic).

## Installation

```bash
npm install -g code-review-cli
```

## Quick Start

1. Initialize the project:
```bash
crc init
```

2. Set up global API keys (optional, for OpenAI/Anthropic/OpenRouter):
```bash
crc setup-global
```

3. Review your latest commit:
```bash
crc
```

## Commands

### Review Commands

- **`crc`** or **`crc --fast`** - Fast scan of latest commit (default)
  - Reviews only changed files and their direct dependencies
  - Fast and efficient for quick feedback

- **`crc --deep`** - Deep scan with transitive dependencies
  - Reviews changed files and all transitive dependencies
  - More comprehensive but slower (coming soon)

### Configuration Commands

- **`crc init`** - Initialize configuration and create `.code-review.config`
  - Creates a project-specific configuration file
  - Sets up default provider settings

- **`crc setup-global`** - Set up global configuration file for API keys
  - Creates `~/.code-review-cli/config.yaml` for storing API keys
  - Useful for sharing API keys across multiple projects
  - API keys are stored in environment variable format: `env:API_KEY_NAME`

- **`crc config <global|project>`** - Manage configuration (coming soon)
  - View or edit global or project configuration files

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
      - gpt-4

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

## License

MIT
