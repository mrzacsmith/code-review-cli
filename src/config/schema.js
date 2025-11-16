const Joi = require('joi');

const providerSchema = Joi.object({
  enabled: Joi.boolean().required(),
  api_key: Joi.string().optional(),
  base_url: Joi.string().uri().optional(),
  models: Joi.array().items(Joi.string()).min(1).optional(),
});

const outputSchema = Joi.object({
  reports_dir: Joi.string().default('.code-reviews'),
  format: Joi.string().valid('markdown').default('markdown'),
});

const configSchema = Joi.object({
  providers: Joi.object({
    ollama: providerSchema.optional(),
    openrouter: providerSchema.optional(),
    openai: providerSchema.optional(),
    anthropic: providerSchema.optional(),
  }).required(),
  output: outputSchema.optional(),
  rules_file: Joi.string().optional(),
  dependency_depth: Joi.number().integer().min(1).max(5).default(2),
});

module.exports = { configSchema };

