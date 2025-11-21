# Task 2: Dynamic Model Enable/Disable System - Research Document

## Executive Summary

This document explores different approaches for enabling/disabling LLM models and providers dynamically through CLI commands, without requiring manual config file editing.

---

## Current State Analysis

### How Config Management Works Now

**Config Files:**
1. **Global**: `~/.code-review-cli/config.yaml` - Stores API keys, can set default providers
2. **Project**: `.code-review.config` - Project-specific settings, overrides global

**Merge Behavior (`src/config/loader.js:85-126`):**
```javascript
// Project settings ALWAYS override global settings
const mergedProvider = { ...globalProvider, ...providerConfig };

// Special case: API keys
// If project has env: reference and global has actual key → use global key
if (providerConfig.api_key.startsWith('env:') &&
    !globalProvider.api_key.startsWith('env:')) {
  mergedProvider.api_key = globalProvider.api_key;
}
```

**Key Insight:** `enabled` flag in project config ALWAYS wins, even if global says `enabled: true`.

### Current User Workflow

**To enable/disable a provider:**
1. Open config file in editor (`crc config project edit`)
2. Find provider section
3. Change `enabled: true/false`
4. Save file
5. Press Enter (if using GUI editor)

**Problems:**
- Manual editing is error-prone (YAML syntax)
- Users must understand config structure
- Easy to accidentally break config
- No validation until next `crc` run
- GUI editor workflow has timing issues

---

## Research: UX Approaches

### Option A: Command-Line Flags (Imperative)

#### Syntax Design

```bash
# Provider level (enable/disable entire provider)
crc config enable openai
crc config disable anthropic
crc config toggle ollama

# Model level (add/remove specific models)
crc config add-model openai gpt-4o-mini
crc config remove-model openai gpt-4o
crc config set-models openai gpt-4o-mini,gpt-4o  # Replace all

# Scope flags
crc config enable openai --global     # Modify global config
crc config enable openai --project    # Modify project config (default)
```

#### Pros
- ✅ Scriptable and automatable
- ✅ Fast for power users
- ✅ Clear intent (one command = one action)
- ✅ Can be used in CI/CD
- ✅ Works over SSH
- ✅ Familiar to CLI users

#### Cons
- ❌ Requires users to know exact model names
- ❌ No discovery (can't browse available models first)
- ❌ Multiple commands to configure multiple items
- ❌ Steeper learning curve for beginners

#### Implementation Complexity
- **Medium**: Need to parse YAML, modify specific fields, write back
- Need robust error handling for invalid provider/model names
- Must validate before writing
- Need to handle both config formats (global and project)

---

### Option B: Interactive Menu (Declarative)

#### Proposed Flow

```bash
$ crc config models

┌─ Configure LLM Models ────────────────────┐
│                                            │
│  Select providers to enable:               │
│  [✓] Ollama                               │
│  [ ] OpenAI                               │
│  [✓] Anthropic                            │
│  [ ] OpenRouter                           │
│                                            │
│  ↑↓: Navigate  Space: Toggle  Enter: Next │
└────────────────────────────────────────────┘

┌─ Ollama Models ───────────────────────────┐
│                                            │
│  Installed models:                         │
│  [✓] codellama:7b                         │
│  [✓] deepseek-coder:latest                │
│  [ ] llama2:latest (not installed)        │
│                                            │
│  ↑↓: Navigate  Space: Toggle  Enter: Next │
└────────────────────────────────────────────┘

┌─ Anthropic Models ────────────────────────┐
│                                            │
│  Available models:                         │
│  [✓] claude-sonnet-4-5 (Recommended)      │
│  [ ] claude-haiku-4-5                     │
│  [ ] claude-opus-4-1                      │
│                                            │
│  ↑↓: Navigate  Space: Toggle  Enter: Save │
└────────────────────────────────────────────┘

Configuration saved to .code-review.config
```

#### Library Options
- `inquirer` (most popular, 20M+ downloads/week)
- `prompts` (lightweight, 5M downloads/week)
- `enquirer` (more features, 800K downloads/week)

#### Pros
- ✅ Beginner-friendly (visual, guided)
- ✅ Discovery-oriented (see all options)
- ✅ Less error-prone (can't type wrong model name)
- ✅ Single command to configure everything
- ✅ Preview changes before saving

#### Cons
- ❌ Not scriptable
- ❌ Doesn't work over SSH without proper terminal
- ❌ Slower for power users who know what they want
- ❌ Adds dependencies
- ❌ Requires more code/testing

#### Implementation Complexity
- **High**: Need to integrate interactive library, design multi-step flow
- Must handle terminal compatibility issues
- More code to maintain
- More edge cases (terminal size, colors, etc.)

---

### Option C: Hybrid Approach (Best of Both)

Combine both approaches - support both command-line flags AND interactive menu.

```bash
# Quick flags for power users
crc config enable openai
crc config add-model anthropic claude-sonnet-4-5

# Interactive menu for exploration
crc config models
```

#### Pros
- ✅ Flexibility for all user types
- ✅ Discoverable for beginners, efficient for experts
- ✅ Scriptable when needed
- ✅ User can choose their preferred workflow

#### Cons
- ❌ Most code to write and maintain
- ❌ Two systems to keep in sync
- ❌ More documentation needed

---

## Config Management Deep Dive

### What Needs to Change

To enable/disable providers or models, we need to modify YAML files:

**Enable a provider:**
```yaml
providers:
  openai:
    enabled: true  # ← Change this
    api_key: env:OPENAI_API_KEY
    models:
      - gpt-4o-mini
```

**Add a model:**
```yaml
providers:
  openai:
    enabled: true
    api_key: env:OPENAI_API_KEY
    models:
      - gpt-4o-mini
      - gpt-4o  # ← Add this
```

### Where to Modify (Project vs Global)

**Decision Tree:**
1. If modifying API keys → Global config preferred
2. If modifying enabled status → Project config (for per-project control)
3. If modifying models → Depends on use case:
   - Global: User wants same models everywhere
   - Project: Different projects need different models

**Recommendation:** Default to project config, allow `--global` flag for global modifications.

### Validation Requirements

Before saving changes:
1. **Provider exists:** Check against known providers (ollama, openai, anthropic, openrouter)
2. **Model names valid:** Query provider APIs or check against known models
3. **API key required:** If enabling a provider, ensure API key is set (global or project)
4. **YAML syntax:** Ensure valid YAML after modification
5. **Schema compliance:** Run through existing `configSchema` validator

---

## Recommended Approach

### Phase 1: Command-Line Flags (MVP)

Start with **Option A** (command-line flags) for these reasons:
1. Lower implementation complexity
2. Immediately useful for power users
3. No new dependencies
4. Establishes the foundation for future features
5. Can add interactive menu later (Phase 2)

### Phase 2: Interactive Menu (Enhancement)

Add **Option B** (interactive menu) as an enhancement:
1. Better for beginners
2. Provides discovery
3. Builds on Phase 1 infrastructure

---

## Implementation Plan: Command-Line Flags

### Commands to Implement

#### Provider Commands
```bash
# Enable/disable entire providers
crc config provider enable <name> [--global]
crc config provider disable <name> [--global]
crc config provider toggle <name> [--global]
crc config provider status [--all]  # Show current status
```

#### Model Commands
```bash
# Add/remove individual models
crc config model add <provider> <model> [--global]
crc config model remove <provider> <model> [--global]
crc config model set <provider> <model1,model2,...> [--global]  # Replace all
crc config model list <provider>  # Show configured models
```

### Algorithm: Modify Config File

```javascript
async function modifyConfig(configPath, provider, action, value, options = {}) {
  // 1. Read current config
  const content = await fs.readFile(configPath, 'utf8');
  const config = yaml.load(content);

  // 2. Validate provider exists
  if (!config.providers[provider]) {
    throw new Error(`Provider ${provider} not found in config`);
  }

  // 3. Perform modification
  switch(action) {
    case 'enable':
      config.providers[provider].enabled = true;
      break;
    case 'disable':
      config.providers[provider].enabled = false;
      break;
    case 'toggle':
      config.providers[provider].enabled = !config.providers[provider].enabled;
      break;
    case 'add-model':
      if (!config.providers[provider].models) {
        config.providers[provider].models = [];
      }
      if (!config.providers[provider].models.includes(value)) {
        config.providers[provider].models.push(value);
      }
      break;
    case 'remove-model':
      config.providers[provider].models =
        config.providers[provider].models.filter(m => m !== value);
      break;
    case 'set-models':
      config.providers[provider].models = value.split(',');
      break;
  }

  // 4. Validate modified config
  const { error } = configSchema.validate(config);
  if (error) {
    throw new Error(`Invalid configuration: ${error.message}`);
  }

  // 5. Write back to file
  const yamlContent = yaml.dump(config, { indent: 2, lineWidth: -1 });
  await fs.writeFile(configPath, yamlContent, 'utf8');

  // 6. Confirm to user
  console.log(`✓ ${action} ${provider} in ${configPath}`);
}
```

### Error Handling

**Scenarios to handle:**
1. Config file doesn't exist → Create with defaults
2. Invalid YAML → Show error, don't modify
3. Provider doesn't exist → List available providers
4. Model doesn't exist → Warn but allow (user might know better)
5. Missing API key → Warn when enabling provider
6. Schema validation fails → Show specific error

### User Experience

**Success case:**
```bash
$ crc config provider enable openai
✓ Enabled openai provider in .code-review.config
  API Key: Set (from global config)
  Models: gpt-4o-mini

Run 'crc doctor openai' to test connectivity
```

**Error case:**
```bash
$ crc config provider enable foobar
✗ Unknown provider: foobar

Available providers:
  • ollama
  • openai
  • anthropic
  • openrouter
```

**Model validation:**
```bash
$ crc config model add openai gpt-99-turbo
⚠️  Warning: Model 'gpt-99-turbo' not found in OpenAI's model list
   Added anyway (you may know better)

   Available OpenAI models:
   • gpt-4o-mini
   • gpt-4o
   • gpt-3.5-turbo
   ...

   Run 'crc show openai' to see all available models
```

---

## Files to Create/Modify

### New Files
1. `src/commands/configModify.js` - Core modification logic
2. `src/utils/yamlEditor.js` - Safe YAML editing utilities

### Modified Files
1. `src/commands/config.js` - Add new subcommands
2. `src/cli.js` - Register new commands
3. `README.md` - Document new commands
4. `src/help/index.js` - Add help text

---

## Testing Strategy

### Unit Tests
- YAML parsing/modification
- Config validation
- Merge behavior
- Error scenarios

### Integration Tests
- End-to-end command execution
- File system operations
- Multiple config files (global + project)

### Manual Testing
- Test on clean install
- Test with existing configs
- Test error cases
- Test --global flag

---

## Migration Considerations

**Backwards Compatibility:**
- ✅ Existing configs work unchanged
- ✅ Manual editing still supported
- ✅ No breaking changes

**Future Enhancements:**
- Add interactive menu (Phase 2)
- Auto-detect best models for user's API tier
- Suggest model combinations for cost optimization
- Bulk operations (enable all, disable all)

---

## Comparison Matrix

| Feature | CLI Flags | Interactive Menu | Hybrid |
|---------|-----------|-----------------|---------|
| **Ease of Use (Beginner)** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Ease of Use (Expert)** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Scriptability** | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐⭐ |
| **Discovery** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Implementation Time** | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| **Maintenance Burden** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Works over SSH** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Error Prevention** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## Final Recommendation

### Approach: **Phased Hybrid Implementation**

**Phase 1 (Now):** Implement CLI flags (Option A)
- Commands: `crc config provider enable/disable/toggle`
- Commands: `crc config model add/remove/set`
- Focus: Solid foundation, well-tested, documented

**Phase 2 (Future):** Add interactive menu (Option B)
- Command: `crc config models` (interactive)
- Reuses validation/modification logic from Phase 1
- Optional enhancement, doesn't block Phase 1

**Rationale:**
1. CLI flags provide immediate value with less risk
2. Establishes patterns for config modification
3. Interactive menu can leverage same infrastructure
4. Users can choose their preferred workflow
5. Incremental development reduces risk

---

## Next Steps

1. Review this research document
2. Get approval on recommended approach
3. Create detailed implementation spec for Phase 1
4. Begin development of `crc config provider` commands
5. Add tests and documentation
6. Plan Phase 2 after Phase 1 ships

---

## Open Questions

1. **Should we allow enabling providers without API keys?**
   - Recommendation: Yes, but warn user and suggest `crc setup-global`

2. **Should model validation be strict or permissive?**
   - Recommendation: Permissive (warn but allow), users might use preview models

3. **Should --global be default or --project?**
   - Recommendation: --project default (per-project flexibility)

4. **Should we add a `crc config validate` command?**
   - Recommendation: Yes, useful for debugging

5. **Should we create config backups before modifying?**
   - Recommendation: Yes, save to `.code-review.config.backup`
