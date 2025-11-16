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

2. Review your latest commit:
```bash
crc
```

3. Deep scan with transitive dependencies:
```bash
crc --deep
```

## Commands

- `crc init` - Initialize configuration and create `.code-review.config`
- `crc` or `crc --fast` - Fast scan of latest commit
- `crc --deep` - Deep scan with transitive dependencies
- `crc summarize` - Generate codebase summary
- `crc --clean` - Clean report directory (preserves summary)

## Configuration

Configuration is stored in `.code-review.config` (YAML format). See the generated config file for details.

## Requirements

- Node.js 18+
- Git repository

## License

MIT

# code-review-cli
