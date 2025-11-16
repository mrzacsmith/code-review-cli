/**
 * Base provider class with common functionality
 */
class BaseProvider {
  constructor(config) {
    this.config = config;
    this.name = config.name || 'unknown';
    this.models = config.models || [];
    this.maxRetries = 3;
    this.retryDelay = 1000; // Start with 1 second
  }

  /**
   * Validate provider configuration
   */
  validate() {
    if (!this.models || this.models.length === 0) {
      throw new Error(`No models configured for provider: ${this.name}`);
    }
    return true;
  }

  /**
   * Retry logic with exponential backoff
   */
  async retry(fn, retries = this.maxRetries) {
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Don't retry on certain errors
        if (this.shouldNotRetry(error)) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < retries) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Determine if error should not be retried
   */
  shouldNotRetry(error) {
    // Don't retry on authentication errors, validation errors, etc.
    const status = error.response?.status || error.status;
    if (status === 401 || status === 403 || status === 400) {
      return true;
    }
    return false;
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Review code with all configured models
   * Must be implemented by subclasses
   */
  async review(_prompt) {
    throw new Error('review() method must be implemented by subclass');
  }

  /**
   * Review code with a specific model
   * Must be implemented by subclasses
   */
  async reviewWithModel(_model, _prompt) {
    throw new Error('reviewWithModel() method must be implemented by subclass');
  }

  /**
   * Format error message
   */
  formatError(error) {
    if (error.response) {
      return `${error.response.status}: ${error.response.statusText}`;
    }
    if (error.message) {
      return error.message;
    }
    return String(error);
  }
}

module.exports = { BaseProvider };

