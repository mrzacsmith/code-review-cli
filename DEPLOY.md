# Deployment Steps

## Pre-Deployment Checklist

✅ Author is set in package.json: "mrzacsmith"
✅ Repository URL is correct
✅ All files are ready

## Deployment Steps

### 1. Commit All Changes
```bash
git add .
git commit -m "Prepare for npm deployment: Add LICENSE, CONTRIBUTING.md, update package name to scoped package"
```

### 2. Push to GitHub
```bash
git push origin main
```

### 3. Bump Version (Patch)
This will automatically:
- Update version in package.json (0.1.0 → 0.1.1)
- Create a git commit
- Create a git tag

```bash
npm version patch
```

### 4. Push Version Tag to GitHub
```bash
git push origin main --tags
```

### 5. Unlink Local Package (if linked)
```bash
npm unlink -g @mrzacsmith/code-review-cli
```

### 6. Publish to npm
```bash
npm publish --access public
```

### 7. Test Installation
```bash
npm install -g @mrzacsmith/code-review-cli
crc --help
```

## Quick All-in-One Commands

```bash
# Commit and push
git add .
git commit -m "Prepare for npm deployment"
git push origin main

# Bump version and push tag
npm version patch
git push origin main --tags

# Unlink and publish
npm unlink -g @mrzacsmith/code-review-cli
npm publish --access public

# Test
npm install -g @mrzacsmith/code-review-cli
crc --help
```

