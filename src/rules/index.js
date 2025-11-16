const fs = require('fs').promises;
const path = require('path');

/**
 * Check if path is a directory
 */
async function isDirectory(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Load rules from a single file
 */
async function loadRulesFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return content.trim();
  } catch (err) {
    if (err.code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

/**
 * Load all rule files from a directory
 */
async function loadRulesDirectory(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const ruleFiles = [];

    for (const entry of entries) {
      if (entry.isFile()) {
        const filePath = path.join(dirPath, entry.name);
        const content = await loadRulesFile(filePath);
        if (content) {
          ruleFiles.push({
            name: entry.name,
            content,
          });
        }
      }
    }

    // Sort by filename for consistent ordering
    ruleFiles.sort((a, b) => a.name.localeCompare(b.name));

    return ruleFiles;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

/**
 * Load rules from .cursorrules file or .cursorrules/ directory
 */
async function loadRules(rulesPath = '.cursorrules') {
  const resolvedPath = path.resolve(rulesPath);

  try {
    const isDir = await isDirectory(resolvedPath);

    if (isDir) {
      // Load from directory
      const ruleFiles = await loadRulesDirectory(resolvedPath);
      if (ruleFiles.length === 0) {
        return null;
      }

      // Concatenate with clear separators
      const separator = '\n\n---\n\n';
      const combined = ruleFiles
        .map((file) => `# ${file.name}\n\n${file.content}`)
        .join(separator);

      return combined;
    } else {
      // Load from single file
      return await loadRulesFile(resolvedPath);
    }
  } catch (err) {
    // If file/directory doesn't exist, return null (rules are optional)
    if (err.code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

/**
 * Load rules from config or default path
 */
async function loadRulesFromConfig(config) {
  const rulesPath = config.rules_file || '.cursorrules';
  return await loadRules(rulesPath);
}

module.exports = {
  loadRules,
  loadRulesFromConfig,
  loadRulesFile,
  loadRulesDirectory,
};

