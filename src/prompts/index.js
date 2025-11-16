/**
 * Format files section for template
 */
function formatFilesSection(files) {
  if (!files || files.length === 0) {
    return '';
  }

  let section = `## FILES CHANGED\n\n`;
  for (const file of files) {
    if (file.content) {
      section += `### ${file.path}\n\n\`\`\`\n${file.content}\n\`\`\`\n\n`;
    } else if (file.skipped) {
      section += `### ${file.path}\n\n*[File skipped: ${file.reason}]*\n\n`;
    }
  }
  return section;
}

/**
 * Format dependencies section for template
 */
function formatDependenciesSection(dependencies) {
  if (!dependencies || dependencies.length === 0) {
    return '';
  }

  let section = `## DEPENDENCIES\n\nThese files are imported by the changed files:\n\n`;
  for (const dep of dependencies) {
    if (dep.content) {
      section += `### ${dep.path}\n\n\`\`\`\n${dep.content}\n\`\`\`\n\n`;
    }
  }
  return section;
}

/**
 * Format rules section for template
 */
function formatRulesSection(rules) {
  if (!rules) {
    return '';
  }
  return `## PROJECT RULES\n\n${rules}\n\n`;
}

/**
 * Format diff section for template
 */
function formatDiffSection(diff) {
  if (!diff) {
    return '';
  }
  return `## CHANGES (Git Diff)\n\n\`\`\`diff\n${diff}\n\`\`\`\n\n`;
}

/**
 * Build prompt for code review using template
 */
async function buildReviewPrompt(context) {
  const { rules, diff, files, dependencies } = context;

  // Load template (project > global > default)
  const { loadPromptTemplate } = require('./manager');
  const { content: template } = await loadPromptTemplate();

  // Format sections
  const rulesSection = formatRulesSection(rules);
  const filesSection = formatFilesSection(files);
  const depsSection = formatDependenciesSection(dependencies);
  const diffSection = formatDiffSection(diff);

  // Replace template variables
  let prompt = template
    .replace(/\{\{rules\}\}/g, rulesSection)
    .replace(/\{\{files\}\}/g, filesSection)
    .replace(/\{\{dependencies\}\}/g, depsSection)
    .replace(/\{\{diff\}\}/g, diffSection);

  // Clean up multiple newlines (from empty sections)
  prompt = prompt.replace(/\n{4,}/g, '\n\n\n');

  return prompt.trim();
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

