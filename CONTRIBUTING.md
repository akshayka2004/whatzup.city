# Contributing & Git Strategy Guide

Welcome to the SaaS platform monorepo! To keep the codebase clean, stable, and easy to maintain, we enforce a strict branching strategy, conventional commit standards, and lint/format validation before any merge.

---

## 🌿 Git Branching Strategy

We follow a structured branching workflow to prevent direct commits to the `main` branch:

1. **`main` Branch**:
   - Contains the stable, production-ready version of the platform.
   - Pushes are restricted; changes can only be merged via pull requests (PRs) after passes on the CI/CD pipeline and approval.
2. **`develop` Branch**:
   - The integration branch for new features and bug fixes.
3. **Feature Branches (`feature/*`)**:
   - Used for developing new features.
   - Example: `feature/verified-commerce-billing`
4. **Bugfix Branches (`bugfix/*` or `fix/*`)**:
   - Used for fixing bugs in the codebase.
   - Example: `bugfix/api-compilation-error`
5. **Hotfix Branches (`hotfix/*`)**:
   - Used for quick patches in production.
   - Example: `hotfix/session-expiry-crash`

---

## 💬 Commit Message Convention

We follow the **Conventional Commits** specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Allowed Types:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semi-colons, etc.)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process, dependencies, or auxiliary tools

---

## 🧹 Code Quality & Linting/Formatting

Code quality checks are run on every pull request. Run them locally to ensure your code passes CI:

### 1. Formatting with Prettier

Enforce styling consistency:

```bash
# Check formatting
pnpm format

# Automatically fix formatting issues
pnpm format:fix
```

### 2. Linting with ESLint

Check for syntax, typing, and quality issues:

```bash
# Run lint checks
pnpm lint

# Automatically fix lint issues
pnpm lint:fix
```

### 3. Build Validation

Ensure the entire monorepo builds cleanly:

```bash
pnpm build
```
