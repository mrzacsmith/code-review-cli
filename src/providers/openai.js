const { OpenAI } = require('openai');
const { BaseProvider } = require('./base');

/**
 * OpenAI provider implementation
 */
class OpenAIProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.apiKey = config.api_key;
    this.timeout = 60000; // 1 minute
    this.maxTokens = config.max_tokens || 3000;
    this.temperature = config.temperature !== undefined ? config.temperature : 0.7;
  }

  /**
   * Validate provider configuration
   */
  validate() {
    super.validate();

    if (!this.apiKey) {
      throw new Error('OpenAI api_key is required');
    }

    return true;
  }

  /**
   * Review code with a specific model
   */
  async reviewWithModel(model, prompt) {
    const startTime = Date.now();

    try {
      const client = new OpenAI({
        apiKey: this.apiKey,
        timeout: this.timeout,
      });

      // Truncate prompt if too long (leave room for response)
      // GPT-4 has 8192 token limit, so we'll aim for ~4000 tokens max in prompt
      // Rough estimate: 1 token ≈ 4 characters, but be conservative
      const maxChars = 15000; // ~3750 tokens, leaving room for 4000 token response
      const truncatedPrompt =
        prompt.length > maxChars
          ? prompt.substring(0, maxChars) +
            '\n\n[Content truncated due to length. Reviewing first portion of changes.]'
          : prompt;

      // Determine model-specific parameters
      // GPT-5 and newer models (o1, o3) have special requirements:
      // - Use max_completion_tokens instead of max_tokens
      // - Do not support custom temperature (fixed at 1.0)
      const isNewModel = model.startsWith('gpt-5') || model.startsWith('o1') || model.startsWith('o3');
      const tokenParam = isNewModel ? 'max_completion_tokens' : 'max_tokens';

      const requestParams = {
        model,
        messages: [
          {
            role: 'user',
            content: truncatedPrompt,
          },
        ],
        [tokenParam]: this.maxTokens,
      };

      // Only add temperature for models that support it (not GPT-5/o1/o3)
      if (!isNewModel) {
        requestParams.temperature = this.temperature;
      }

      const response = await this.retry(async () => {
        return await client.chat.completions.create(requestParams);
      });

      const processingTime = Date.now() - startTime;

      // Extract review text - handle GPT-5 refusal field
      let reviewText = '';

      if (response.choices && response.choices[0]) {
        const choice = response.choices[0];

        // Check for GPT-5 refusal first
        if (choice.message?.refusal) {
          throw new Error(`Model refused to respond: ${choice.message.refusal}`);
        }

        // Try multiple possible content locations
        reviewText = choice.message?.content ||
                     choice.message?.text ||
                     choice.text ||
                     choice.content ||
                     '';
      } else if (response.output) {
        // GPT-5 Responses API format
        reviewText = response.output[0]?.content ||
                     response.output[0]?.text ||
                     '';
      }

      // If still no content, something went wrong
      if (!reviewText) {
        throw new Error('Empty response from model - no content returned');
      }

      return {
        model,
        provider: this.name,
        review: reviewText.trim(),
        processingTime,
        success: true,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      return {
        model,
        provider: this.name,
        review: null,
        error: this.formatError(error),
        processingTime,
        success: false,
      };
    }
  }

  /**
   * Review code with all configured models in parallel
   */
  async review(prompt) {
    this.validate();

    const results = await Promise.all(
      this.models.map((model) => this.reviewWithModel(model, prompt))
    );

    return {
      provider: this.name,
      results,
      successCount: results.filter((r) => r.success).length,
      totalCount: results.length,
    };
  }
}

module.exports = { OpenAIProvider };

