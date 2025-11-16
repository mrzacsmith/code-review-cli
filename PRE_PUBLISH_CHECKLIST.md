# Pre-Publish Checklist

## Before Publishing to npm

### 1. ✅ Unlink the Package (IMPORTANT)
If you've used `npm link` for local testing, unlink it before publishing:

```bash
npm unlink -g code-review-cli
```

**Why?** If the package is linked, npm publish might include symlinks or cause issues. Always unlink before publishing.

### 2. ✅ Clean Up User-Generated Files
The `.code-reviews/` folder is already excluded via `.npmignore`, but you can clean it up:

```bash
# Optional: Remove review reports (they're already excluded from npm)
rm -rf .code-reviews/*
```

**Note:** This folder is already in `.gitignore` and `.npmignore`, so it won't be published or committed. Cleaning it is optional but keeps your workspace tidy.

### 3. ✅ Verify Package Contents
Check what will be included in the npm package:

```bash
npm pack --dry-run
```

This shows exactly what files will be included without actually creating the tarball.

### 4. ✅ Update Version (if needed)
If this is a new version:

```bash
npm version patch  # for 0.1.0 -> 0.1.1
# or
npm version minor  # for 0.1.0 -> 0.2.0
# or
npm version major  # for 0.1.0 -> 1.0.0
```

### 5. ✅ Update Repository URL (if needed)
Edit `package.json` and update the repository URL:
```json
"repository": {
  "type": "git",
  "url": "https://github.com/mrzacsmith/code-review-cli.git"
}
```

### 6. ✅ Test Locally
Make sure everything works:
```bash
npm test  # if you have tests
npm run lint  # check for linting errors
```

### 7. ✅ Publish
Once everything is ready:
```bash
npm publish
```

Or for a scoped package or first-time publish:
```bash
npm publish --access public
```

## Files Already Excluded (via .npmignore)
- ✅ `.code-reviews/` - User-generated reports
- ✅ `.code-review.config` - User config
- ✅ `tests/` - Test files
- ✅ Development config files (`.eslintrc.js`, `.prettierrc`, etc.)
- ✅ `.git/` - Git files
- ✅ `node_modules/` - Dependencies

## Files Included in Package
- ✅ `bin/crc.js` - CLI entry point
- ✅ `src/` - All source code
- ✅ `README.md` - Documentation
- ✅ `package.json` - Package metadata

