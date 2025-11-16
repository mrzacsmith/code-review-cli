const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { DEFAULT_PROMPT_TEMPLATE } = require('./template');

/**
 * Get global prompt template path
 */
function getGlobalPromptPath() {
  const homeDir = os.homedir();
  return path.join(homeDir, '.code-review-cli', 'prompt.template');
}

/**
 * Get project prompt template path
 */
function getProjectPromptPath() {
  return path.resolve('.code-review.prompt');
}

/**
 * Load prompt template (project > global > default)
 */
async function loadPromptTemplate(useGlobal = false) {
  // Try project prompt first (unless global flag)
  if (!useGlobal) {
    try {
      const projectPath = getProjectPromptPath();
      const content = await fs.readFile(projectPath, 'utf8');
      return { content, source: 'project', path: projectPath };
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
  }

  // Try global prompt
  try {
    const globalPath = getGlobalPromptPath();
    const content = await fs.readFile(globalPath, 'utf8');
    return { content, source: 'global', path: globalPath };
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }

  // Fall back to default
  return {
    content: DEFAULT_PROMPT_TEMPLATE,
    source: 'default',
    path: null,
  };
}

/**
 * Save prompt template
 */
async function savePromptTemplate(content, useGlobal = false) {
  if (useGlobal) {
    const globalPath = getGlobalPromptPath();
    const globalDir = path.dirname(globalPath);
    await fs.mkdir(globalDir, { recursive: true });
    await fs.writeFile(globalPath, content, 'utf8');
    return { path: globalPath, source: 'global' };
  } else {
    const projectPath = getProjectPromptPath();
    await fs.writeFile(projectPath, content, 'utf8');
    return { path: projectPath, source: 'project' };
  }
}

/**
 * Delete prompt template (reset to default)
 */
async function deletePromptTemplate(useGlobal = false) {
  if (useGlobal) {
    const globalPath = getGlobalPromptPath();
    try {
      await fs.unlink(globalPath);
      return true;
    } catch (err) {
      if (err.code === 'ENOENT') {
        return false; // Already doesn't exist
      }
      throw err;
    }
  } else {
    const projectPath = getProjectPromptPath();
    try {
      await fs.unlink(projectPath);
      return true;
    } catch (err) {
      if (err.code === 'ENOENT') {
        return false; // Already doesn't exist
      }
      throw err;
    }
  }
}

module.exports = {
  loadPromptTemplate,
  savePromptTemplate,
  deletePromptTemplate,
  getGlobalPromptPath,
  getProjectPromptPath,
  DEFAULT_PROMPT_TEMPLATE,
};

