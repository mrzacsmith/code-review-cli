const axios = require('axios');
const { BaseProvider } = require('./base');

/**
 * OpenRouter provider implementation
 */
class OpenRouterProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.apiKey = config.api_key;
    this.baseUrl = 'https://openrouter.ai/api/v1';
    this.timeout = 60000; // 1 minute
  }

  /**
   * Validate provider configuration
   */
  validate() {
    super.validate();

    if (!this.apiKey) {
      throw new Error('OpenRouter api_key is required');
    }

    return true;
  }

  /**
   * Review code with a specific model
   */
  async reviewWithModel(model, prompt) {
    const startTime = Date.now();

    try {
      // Truncate prompt if too long (leave room for response)
      // Most models have limits, so we'll be conservative
      const maxChars = 15000; // ~3750 tokens, leaving room for response
      const truncatedPrompt =
        prompt.length > maxChars
          ? prompt.substring(0, maxChars) +
            '\n\n[Content truncated due to length. Reviewing first portion of changes.]'
          : prompt;

      const response = await this.retry(async () => {
        return await axios.post(
          `${this.baseUrl}/chat/completions`,
          {
            model,
            messages: [
              {
                role: 'user',
                content: truncatedPrompt,
              },
            ],
            temperature: 0.7,
            max_tokens: 3000,
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://github.com/mrzacsmith/code-review-cli',
              'X-Title': 'Code Review CLI',
            },
            timeout: this.timeout,
          }
        );
      });

      const processingTime = Date.now() - startTime;
      const reviewText = response.data.choices[0]?.message?.content || '';

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

      // Provide more helpful error messages based on OpenRouter-specific errors
      if (error.response?.status === 401) {
        errorMessage = 'Invalid OpenRouter API key';
      } else if (error.response?.status === 402) {
        errorMessage = 'Insufficient credits on OpenRouter account';
      } else if (error.response?.status === 429) {
        errorMessage = 'Rate limited by OpenRouter API';
      } else if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
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

module.exports = { OpenRouterProvider };
