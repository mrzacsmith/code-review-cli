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

      // Determine which token parameter to use based on model
      // GPT-5 and newer models (o1, o3) use max_completion_tokens instead of max_tokens
      const isNewModel = model.startsWith('gpt-5') || model.startsWith('o1') || model.startsWith('o3');
      const tokenParam = isNewModel ? 'max_completion_tokens' : 'max_tokens';

      const response = await this.retry(async () => {
        return await client.chat.completions.create({
          model,
          messages: [
            {
              role: 'user',
              content: truncatedPrompt,
            },
          ],
          temperature: 0.7,
          [tokenParam]: this.maxTokens,
        });
      });

      const processingTime = Date.now() - startTime;
      const reviewText = response.choices[0]?.message?.content || '';

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

