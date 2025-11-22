const DEFAULT_CONFIG = `providers:
  ollama:
    enabled: true
    base_url: http://localhost:11434
    models:
      - codellama
      - deepseek-coder
    # max_tokens: 3000  # Optional: Maximum tokens for model response (default: 3000)
    # temperature: 0.7  # Optional: Sampling temperature 0-2 (default: 0.7, higher = more random)

  openrouter:
    enabled: false
    api_key: env:OPENROUTER_API_KEY
    models:
      - anthropic/claude-sonnet-4
    # max_tokens: 3000  # Optional: Maximum tokens for model response (default: 3000)
    # temperature: 0.7  # Optional: Sampling temperature 0-2 (default: 0.7, higher = more random)

  openai:
    enabled: false
    api_key: env:OPENAI_API_KEY
    models:
      - gpt-4o-mini
    # max_tokens: 3000  # Optional: Maximum tokens for model response (default: 3000)
    # temperature: 0.7  # Optional: Sampling temperature 0-2 (default: 0.7, higher = more random)
    # Note: GPT-5, o1, o3 models don't support custom temperature (fixed at 1.0)
    # Note: GPT-5, o1, o3 automatically get 3x max_tokens (for reasoning + output)

  anthropic:
    enabled: false
    api_key: env:ANTHROPIC_API_KEY
    models:
      - claude-sonnet-4-5
    # max_tokens: 3000  # Optional: Maximum tokens for model response (default: 3000)
    # temperature: 0.7  # Optional: Sampling temperature 0-2 (default: 0.7, higher = more random)

output:
  reports_dir: .code-reviews
  format: markdown

multi_commit:
  max_commits: 5
  default_base_branch: main
  include_merge_commits: false

rules_file: .cursorrules

dependency_depth: 2
`;

module.exports = { DEFAULT_CONFIG };

