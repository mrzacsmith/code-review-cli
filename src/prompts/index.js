/**
 * Build prompt for code review
 */
function buildReviewPrompt(context) {
  const { rules, diff, files, dependencies } = context;

  let prompt = `You are a code reviewer. Analyze these changes and provide a comprehensive code review.\n\n`;

  // Add project rules if available
  if (rules) {
    prompt += `## PROJECT RULES\n\n${rules}\n\n`;
  }

  // Add file contents
  if (files && files.length > 0) {
    prompt += `## FILES CHANGED\n\n`;
    for (const file of files) {
      if (file.content) {
        prompt += `### ${file.path}\n\n\`\`\`\n${file.content}\n\`\`\`\n\n`;
      } else if (file.skipped) {
        prompt += `### ${file.path}\n\n*[File skipped: ${file.reason}]*\n\n`;
      }
    }
  }

  // Add dependencies if available
  if (dependencies && dependencies.length > 0) {
    prompt += `## DEPENDENCIES\n\nThese files are imported by the changed files:\n\n`;
    for (const dep of dependencies) {
      if (dep.content) {
        prompt += `### ${dep.path}\n\n\`\`\`\n${dep.content}\n\`\`\`\n\n`;
      }
    }
  }

  // Add git diff
  if (diff) {
    prompt += `## CHANGES (Git Diff)\n\n\`\`\`diff\n${diff}\n\`\`\`\n\n`;
  }

  // Instructions
  prompt += `## REVIEW INSTRUCTIONS\n\n`;
  prompt += `Please provide a code review with the following sections:\n\n`;
  prompt += `1. **Issues Found**: List any bugs, security vulnerabilities, performance issues, or style violations\n`;
  prompt += `2. **Suggestions**: Recommendations for improvement\n`;
  prompt += `3. **Positive Notes**: Things done well\n`;
  prompt += `4. **Severity Rating**: For each issue, indicate severity (Critical, High, Medium, Low)\n\n`;
  prompt += `Be thorough, constructive, and specific. Reference line numbers when possible.`;

  return prompt;
}

/**
 * Build context object for review
 */
function buildContext(options) {
  const {
    rules = null,
    diff = null,
    changedFiles = [],
    dependencyFiles = [],
  } = options;

  return {
    rules,
    diff,
    files: changedFiles,
    dependencies: dependencyFiles,
  };
}

module.exports = {
  buildReviewPrompt,
  buildContext,
};

