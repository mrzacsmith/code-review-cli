const DEFAULT_CONFIG = `providers:
  ollama:
    enabled: true
    base_url: http://localhost:11434
    models:
      - codellama
      - deepseek-coder

  openrouter:
    enabled: false
    api_key: env:OPENROUTER_API_KEY
    models:
      - anthropic/claude-sonnet-4

  openai:
    enabled: false
    api_key: env:OPENAI_API_KEY
    models:
      - gpt-4

  anthropic:
    enabled: false
    api_key: env:ANTHROPIC_API_KEY
    models:
      - claude-sonnet-4-5

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

