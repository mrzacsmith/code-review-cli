# Model Compatibility Guide

This document provides detailed information about model-specific parameter support and compatibility for different LLM providers.

## Quick Reference

| Model Family | `max_tokens` | `max_completion_tokens` | `temperature` | Notes |
|--------------|--------------|-------------------------|---------------|-------|
| GPT-4, GPT-4o, GPT-4 Turbo | ✅ | ❌ | ✅ | Standard OpenAI models |
| GPT-3.5 Turbo | ✅ | ❌ | ✅ | Standard OpenAI models |
| **GPT-5** | ❌ | ✅ | ❌ | Uses fixed temperature of 1.0 |
| **o1-preview, o1-mini** | ❌ | ✅ | ❌ | Uses fixed temperature of 1.0 |
| **o3-mini** | ❌ | ✅ | ❌ | Uses fixed temperature of 1.0 |
| Claude (all versions) | ✅ | ❌ | ✅ | Anthropic models |
| Ollama (all models) | ✅ | ❌ | ✅ | Local models |

## OpenAI Models

### Standard Models (GPT-4, GPT-3.5, etc.)

**Supported Parameters:**
- `max_tokens` ✅ (range: 1-128000 depending on model)
- `temperature` ✅ (range: 0-2, default: 0.7)

**Example Configuration:**
```yaml
providers:
  openai:
    enabled: true
    api_key: env:OPENAI_API_KEY
    models:
      - gpt-4o-mini
      - gpt-4-turbo
    max_tokens: 3000
    temperature: 0.7
```

### New Generation Models (GPT-5, o1, o3)

**Special Requirements:**
- ❌ Do NOT support `max_tokens` - use `max_completion_tokens` instead
- ❌ Do NOT support custom `temperature` - fixed at 1.0
- System automatically handles these differences

**Affected Models:**
- `gpt-5` (all variants)
- `o1-preview`
- `o1-mini`
- `o3-mini`
- Any future models starting with `gpt-5`, `o1`, or `o3`

**Example Configuration:**
```yaml
providers:
  openai:
    enabled: true
    api_key: env:OPENAI_API_KEY
    models:
      - gpt-5  # System automatically uses max_completion_tokens
    max_tokens: 3000  # This value will be sent as max_completion_tokens
    temperature: 0.7  # This will be IGNORED for GPT-5/o1/o3
```

**What Happens Automatically:**
1. System detects model starts with `gpt-5`, `o1`, or `o3`
2. Converts `max_tokens` config to `max_completion_tokens` parameter
3. Omits `temperature` parameter entirely (model uses default 1.0)

## Anthropic Models (Claude)

**Supported Parameters:**
- `max_tokens` ✅ (range: 1-200000 depending on model)
- `temperature` ✅ (range: 0-1, default: 0.7)

**All Claude Models:**
- `claude-sonnet-4-5`
- `claude-haiku-4-5`
- `claude-opus-4-1`
- `claude-3-5-sonnet-20240620`
- `claude-3-5-haiku-20241022`
- `claude-3-opus-20240229`
- And all other Claude variants

**Example Configuration:**
```yaml
providers:
  anthropic:
    enabled: true
    api_key: env:ANTHROPIC_API_KEY
    models:
      - claude-sonnet-4-5
    max_tokens: 3000
    temperature: 0.7
```

## OpenRouter

OpenRouter acts as a proxy to multiple providers. Parameter support depends on the underlying model.

**For OpenAI Models via OpenRouter:**
```yaml
providers:
  openrouter:
    enabled: true
    api_key: env:OPENROUTER_API_KEY
    models:
      - openai/gpt-4o-mini     # Standard OpenAI - supports both params
      - openai/gpt-5           # New generation - special handling
    max_tokens: 3000
    temperature: 0.7
```

**For Anthropic Models via OpenRouter:**
```yaml
providers:
  openrouter:
    enabled: true
    api_key: env:OPENROUTER_API_KEY
    models:
      - anthropic/claude-sonnet-4  # Supports both params
    max_tokens: 3000
    temperature: 0.7
```

**Automatic Detection:**
- System extracts model name after `/` (e.g., `openai/gpt-5` → `gpt-5`)
- Applies same rules as direct OpenAI integration
- GPT-5/o1/o3 models get automatic parameter conversion

## Ollama (Local Models)

**Supported Parameters:**
- `max_tokens` ✅ (depends on model and hardware)
- `temperature` ✅ (range: 0-2, default: 0.7)

**Common Models:**
- `codellama:7b`
- `deepseek-coder:latest`
- `llama2:13b`
- Any locally installed Ollama model

**Example Configuration:**
```yaml
providers:
  ollama:
    enabled: true
    base_url: http://localhost:11434
    models:
      - codellama:7b
      - deepseek-coder:latest
    max_tokens: 3000
    temperature: 0.7
```

## Error Messages

### Common Errors and Solutions

**Error:** `400 Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead.`

**Solution:** You're using GPT-5/o1/o3 with an outdated version. Update to the latest version which handles this automatically.

**Error:** `400 Unsupported value: 'temperature' does not support 0.7 with this model. Only the default (1) value is supported.`

**Solution:** You're using GPT-5/o1/o3 with an outdated version. Update to the latest version which omits temperature for these models automatically.

**Error:** `Invalid temperature value`

**Solution:** Ensure temperature is between 0-2 for most models, 0-1 for Claude.

## How to Check if a Model Needs Special Handling

The system automatically detects models that need special parameter handling based on the model name:

**Detection Logic:**
```javascript
// For direct OpenAI usage
const isNewModel = model.startsWith('gpt-5') ||
                   model.startsWith('o1') ||
                   model.startsWith('o3');

// For OpenRouter usage
const modelName = model.includes('/') ? model.split('/')[1] : model;
const isNewModel = modelName.startsWith('gpt-5') ||
                   modelName.startsWith('o1') ||
                   modelName.startsWith('o3');
```

## Updating for New Models

If OpenAI releases new models with similar requirements:

1. **Check the OpenAI documentation** for the model's parameter support
2. **Update the detection logic** in these files if needed:
   - `src/providers/openai.js` (line ~55)
   - `src/providers/openrouter.js` (line ~52)
   - `src/commands/doctor.js` (lines ~169 and ~460)

3. **Add the model prefix** to the detection logic:
```javascript
const isNewModel = model.startsWith('gpt-5') ||
                   model.startsWith('o1') ||
                   model.startsWith('o3') ||
                   model.startsWith('new-model-prefix');  // Add here
```

4. **Update this documentation** with the new model information

5. **Test with** `crc doctor openai` to verify compatibility

## Testing Model Compatibility

Use the doctor command to test model compatibility:

```bash
# Test OpenAI models
crc doctor openai

# Test all AI providers
crc doctor ai

# Test specific provider
crc doctor anthropic
crc doctor openrouter
```

The doctor command will attempt a small completion test and report any parameter compatibility issues.

## Best Practices

1. **Use latest version** - Always update to the latest version of the CLI to get automatic compatibility handling
2. **Check documentation** - Before using a new model, check if it has special requirements
3. **Test with doctor** - Run `crc doctor <provider>` after adding new models
4. **Monitor errors** - If you see parameter-related errors, check this guide
5. **Report issues** - If you encounter a new model with different requirements, open an issue on GitHub

## Version History

- **v0.1.20** - Added automatic GPT-5/o1/o3 temperature handling
- **v0.1.19** - Added automatic GPT-5/o1/o3 max_completion_tokens support
- **v0.1.18** - Initial configurable max_tokens support

## Additional Resources

- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [Anthropic API Documentation](https://docs.anthropic.com/claude/reference)
- [OpenRouter Documentation](https://openrouter.ai/docs)
- [Ollama Documentation](https://ollama.ai/docs)
