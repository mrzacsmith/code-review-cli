const axios = require('axios');
const { BaseProvider } = require('./base');

/**
 * Ollama provider implementation
 */
class OllamaProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.baseUrl = config.base_url || 'http://localhost:11434';
    this.timeout = 300000; // 5 minutes for local models
  }

  /**
   * Validate provider configuration
   */
  validate() {
    super.validate();

    if (!this.baseUrl) {
      throw new Error('Ollama base_url is required');
    }

    return true;
  }

  /**
   * Check if model is available
   */
  async checkModel(model) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 5000,
      });

      const models = response.data.models || [];
      return models.some((m) => m.name === model || m.name.startsWith(`${model}:`));
    } catch (err) {
      // If we can't check, assume it's available and let the request fail
      return true;
    }
  }

  /**
   * Review code with a specific model
   */
  async reviewWithModel(model, prompt) {
    const startTime = Date.now();

    try {
      const response = await this.retry(async () => {
        return await axios.post(
          `${this.baseUrl}/api/generate`,
          {
            model,
            prompt,
            stream: false,
            options: {
              temperature: 0.7,
              top_p: 0.9,
            },
          },
          {
            timeout: this.timeout,
          }
        );
      });

      const processingTime = Date.now() - startTime;
      const responseText = response.data.response || '';

      return {
        model,
        provider: this.name,
        review: responseText.trim(),
        processingTime,
        success: true,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      let errorMessage = this.formatError(error);
      // Provide more helpful error messages
      if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Cannot connect to Ollama. Make sure Ollama is running (ollama serve)';
      } else if (error.response?.status === 404) {
        errorMessage = `Model "${model}" not found. Pull it with: ollama pull ${model}`;
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

module.exports = { OllamaProvider };

