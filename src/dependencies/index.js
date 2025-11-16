const path = require('path');
const fs = require('fs').promises;
const parser = require('@babel/parser');
const { loadFile } = require('../files');

/**
 * Parse JavaScript/TypeScript/JSX file and extract imports
 */
function extractImportsFromJS(content, filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const isJSX = ext === '.jsx' || ext === '.tsx';

    const plugins = ['jsx', 'typescript', 'decorators-legacy', 'classProperties'];
    const sourceType = 'module';

    const ast = parser.parse(content, {
      sourceType,
      plugins: isJSX ? plugins : plugins.filter((p) => p !== 'jsx'),
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
    });

    const imports = [];

    const traverse = (node) => {
      if (!node) return;

      // ES6 import statements
      if (node.type === 'ImportDeclaration') {
        if (node.source && node.source.value) {
          imports.push({
            type: 'import',
            source: node.source.value,
            specifiers: node.specifiers.map((s) => ({
              imported: s.imported ? s.imported.name : 'default',
              local: s.local.name,
            })),
          });
        }
      }

      // require() calls
      if (node.type === 'CallExpression' && node.callee) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length > 0 &&
          node.arguments[0].type === 'StringLiteral'
        ) {
          imports.push({
            type: 'require',
            source: node.arguments[0].value,
          });
        }
      }

      // Traverse children
      for (const key in node) {
        if (key === 'parent' || key === 'leadingComments' || key === 'trailingComments') {
          continue;
        }
        const child = node[key];
        if (Array.isArray(child)) {
          child.forEach(traverse);
        } else if (child && typeof child === 'object' && child.type) {
          traverse(child);
        }
      }
    };

    traverse(ast);
    return imports;
  } catch (err) {
    // If parsing fails, try regex fallback
    return extractImportsWithRegex(content);
  }
}

/**
 * Fallback regex-based import extraction
 */
function extractImportsWithRegex(content) {
  const imports = [];

  // ES6 imports: import ... from 'module'
  const es6ImportRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = es6ImportRegex.exec(content)) !== null) {
    imports.push({
      type: 'import',
      source: match[1],
    });
  }

  // require() calls: require('module')
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = requireRegex.exec(content)) !== null) {
    imports.push({
      type: 'require',
      source: match[1],
    });
  }

  return imports;
}

/**
 * Extract imports from Python file
 */
async function extractImportsFromPython(filePath) {
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    // Use Python's ast module to extract imports
    const script = `
import ast
import sys
import json

with open('${filePath}', 'r') as f:
    tree = ast.parse(f.read())

imports = []
for node in ast.walk(tree):
    if isinstance(node, ast.Import):
        for alias in node.names:
            imports.append({'type': 'import', 'source': alias.name})
    elif isinstance(node, ast.ImportFrom):
        if node.module:
            imports.append({'type': 'import_from', 'source': node.module})

print(json.dumps(imports))
`;

    const { stdout } = await execAsync(`python3 -c "${script.replace(/\n/g, ' ')}"`);
    return JSON.parse(stdout);
  } catch (err) {
    // Fallback to regex
    const content = await fs.readFile(filePath, 'utf8');
    return extractPythonImportsWithRegex(content);
  }
}

/**
 * Fallback regex for Python imports
 */
function extractPythonImportsWithRegex(content) {
  const imports = [];

  // import module
  const importRegex = /^import\s+([a-zA-Z0-9_.]+)/gm;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push({
      type: 'import',
      source: match[1],
    });
  }

  // from module import ...
  const fromImportRegex = /^from\s+([a-zA-Z0-9_.]+)\s+import/gm;
  while ((match = fromImportRegex.exec(content)) !== null) {
    imports.push({
      type: 'import_from',
      source: match[1],
    });
  }

  return imports;
}

/**
 * Resolve import path to actual file
 */
async function resolveImportPath(importSource, fromFile) {
  // Skip node_modules and built-in modules
  if (importSource.startsWith('.') === false && !path.isAbsolute(importSource)) {
    // Check if it's a node_modules package
    const projectRoot = process.cwd();
    const nodeModulesPath = path.join(projectRoot, 'node_modules', importSource);
    try {
      await fs.access(nodeModulesPath);
      return null; // External package, skip
    } catch {
      // Might be a relative import without ./
      // Try to resolve it
    }
  }

  const fromDir = path.dirname(fromFile);
  let resolved;

  if (path.isAbsolute(importSource)) {
    resolved = importSource;
  } else if (importSource.startsWith('.')) {
    resolved = path.resolve(fromDir, importSource);
  } else {
    // Try relative to current file
    resolved = path.resolve(fromDir, importSource);
  }

  // Try different extensions
  const extensions = ['', '.js', '.jsx', '.ts', '.tsx', '.py', '/index.js', '/index.ts'];
  for (const ext of extensions) {
    const testPath = resolved + ext;
    try {
      const stat = await fs.stat(testPath);
      if (stat.isFile()) {
        return testPath;
      }
    } catch {
      // Continue
    }
  }

  return null;
}

/**
 * Extract dependencies from a file
 */
async function extractDependencies(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  let imports = [];

  try {
    const file = await loadFile(filePath);
    if (file.skipped || !file.content) {
      return [];
    }

    if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
      imports = extractImportsFromJS(file.content, filePath);
    } else if (ext === '.py') {
      imports = await extractImportsFromPython(filePath);
    } else {
      return [];
    }

    // Resolve import paths
    const resolved = [];
    for (const imp of imports) {
      const resolvedPath = await resolveImportPath(imp.source, filePath);
      if (resolvedPath) {
        resolved.push({
          ...imp,
          resolvedPath,
        });
      }
    }

    return resolved;
  } catch (err) {
    return [];
  }
}

/**
 * Get all dependencies for a list of files (direct dependencies only)
 */
async function getDependencies(filePaths) {
  const dependencyMap = new Map();
  const processed = new Set();

  async function processFile(filePath) {
    if (processed.has(filePath)) {
      return; // Avoid circular dependencies
    }
    processed.add(filePath);

    const deps = await extractDependencies(filePath);
    for (const dep of deps) {
      if (dep.resolvedPath && !dependencyMap.has(dep.resolvedPath)) {
        dependencyMap.set(dep.resolvedPath, dep);
        // Recursively process dependencies (for direct deps only, so depth 1)
        await processFile(dep.resolvedPath);
      }
    }
  }

  // Process all input files
  for (const filePath of filePaths) {
    await processFile(filePath);
  }

  return Array.from(dependencyMap.keys());
}

module.exports = {
  extractDependencies,
  getDependencies,
  resolveImportPath,
  extractImportsFromJS,
  extractImportsFromPython,
};

