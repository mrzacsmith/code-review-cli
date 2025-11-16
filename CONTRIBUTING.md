# Contributing to Code Review CLI

Thank you for your interest in contributing to Code Review CLI! This document provides guidelines and instructions for submitting pull requests.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/mrzacsmith/code-review-cli.git
   cd code-review-cli
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

## Development Setup

1. **Link the package locally** for testing:
   ```bash
   npm link
   ```
2. **Test your changes**:
   ```bash
   npm test
   npm run lint
   ```

## Making Changes

### Code Style

- Follow the existing code style and patterns
- Run `npm run lint` before committing
- Run `npm run format` to auto-format code
- Ensure all tests pass: `npm test`

### Commit Messages

Use clear, descriptive commit messages:
- Use present tense ("Add feature" not "Added feature")
- Start with a capital letter
- Keep the first line under 72 characters
- Reference issues when applicable: "Fix #123: Description"

Examples:
```
Add support for custom prompt templates
Fix error handling in Ollama provider
Update README with new installation instructions
```

## Submitting a Pull Request

### Before Submitting

1. **Update tests** if you're adding new features or fixing bugs
2. **Update documentation** (README.md, code comments) if needed
3. **Run the linter**: `npm run lint`
4. **Run tests**: `npm test`
5. **Test your changes** manually with the CLI

### PR Process

1. **Push your branch** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request** on GitHub:
   - Go to the original repository
   - Click "New Pull Request"
   - Select your fork and branch
   - Fill out the PR template (if available)

3. **PR Description should include**:
   - Clear description of what the PR does
   - Why the change is needed
   - How to test the changes
   - Screenshots or examples (if applicable)
   - Reference to related issues (e.g., "Fixes #123")

### PR Checklist

Before submitting, ensure:
- [ ] Code follows the existing style
- [ ] All tests pass (`npm test`)
- [ ] Linter passes (`npm run lint`)
- [ ] Documentation is updated (if needed)
- [ ] Commit messages are clear and descriptive
- [ ] Changes are focused (one feature/fix per PR)

## What to Contribute

We welcome contributions in these areas:

### Features
- New LLM provider integrations
- Additional review modes or scan types
- Configuration enhancements
- Output format improvements

### Bug Fixes
- Fixing errors in existing functionality
- Improving error messages
- Performance optimizations

### Documentation
- Improving README clarity
- Adding examples
- Fixing typos or errors

### Testing
- Adding test coverage
- Improving test quality
- Adding integration tests

## Code Review Process

1. **Automated Checks**: Your PR will be checked by CI (if configured)
2. **Review**: Maintainers will review your code
3. **Feedback**: Address any feedback
4. **Approval**: Once approved, your PR will be merged

## Questions?

- Open an issue for bugs or feature requests
- Ask questions in issue discussions
- Check existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing! 🎉

