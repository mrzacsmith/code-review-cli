/**
 * Default prompt template
 * Note: Template variables will be replaced:
 * - {{rules}} - Project rules from .cursorrules
 * - {{files}} - Full content of changed files (formatted)
 * - {{dependencies}} - Dependency file contents (formatted)
 * - {{diff}} - Git diff output
 * 
 * For now, this is a simple template. The buildReviewPrompt function
 * will handle the actual replacement. Users can customize the instructions
 * and structure while keeping the variable placeholders.
 */
const DEFAULT_PROMPT_TEMPLATE = `You are a code reviewer. Analyze these changes and provide a comprehensive code review.

{{rules}}

{{files}}

{{dependencies}}

{{diff}}

## REVIEW INSTRUCTIONS

Please provide a code review with the following sections:

1. **Issues Found**: List any bugs, security vulnerabilities, performance issues, or style violations
2. **Suggestions**: Recommendations for improvement
3. **Positive Notes**: Things done well
4. **Severity Rating**: For each issue, indicate severity (Critical, High, Medium, Low)

Be thorough, constructive, and specific. Reference line numbers when possible.`;

module.exports = { DEFAULT_PROMPT_TEMPLATE };

