const Anthropic = require('@anthropic-ai/sdk');
const { BaseProvider } = require('./base');

/**
 * Anthropic provider implementation
 */
class AnthropicProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.apiKey = config.api_key;
    this.timeout = 60000; // 1 minute
  }

  /**
   * Validate provider configuration
   */
  validate() {
    super.validate();

    if (!this.apiKey) {
      throw new Error('Anthropic api_key is required');
    }

    return true;
  }

  /**
   * Review code with a specific model
   */
  async reviewWithModel(model, prompt) {
    const startTime = Date.now();

    try {
      const client = new Anthropic({
        apiKey: this.apiKey,
        timeout: this.timeout,
      });

      // Truncate prompt if too long (leave room for response)
      // Claude has various token limits depending on model
      const maxChars = 15000; // ~3750 tokens, leaving room for response
      const truncatedPrompt =
        prompt.length > maxChars
          ? prompt.substring(0, maxChars) +
            '\n\n[Content truncated due to length. Reviewing first portion of changes.]'
          : prompt;

      const response = await this.retry(async () => {
        return await client.messages.create({
          model,
          max_tokens: 3000,
          messages: [
            {
              role: 'user',
              content: truncatedPrompt,
            },
          ],
          temperature: 0.7,
        });
      });

      const processingTime = Date.now() - startTime;
      const reviewText = response.content[0]?.text || '';

      return {
        model,
        provider: this.name,
        review: reviewText.trim(),
        processingTime,
        success: true,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      let errorMessage = this.formatError(error);

      // Provide more helpful error messages based on Anthropic-specific errors
      if (error.status === 401) {
        errorMessage = 'Invalid Anthropic API key';
      } else if (error.status === 429) {
        errorMessage = 'Rate limited by Anthropic API';
      } else if (error.status === 400) {
        errorMessage = 'Bad request to Anthropic API. Check your configuration.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        model,
        provider: this.name,
        review: null,
        error: errorMessage,
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

module.exports = { AnthropicProvider };
