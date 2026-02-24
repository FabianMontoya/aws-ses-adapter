# Contributing to @fmontoya/aws-ses-adapter

Thank you for your interest in contributing! All contributions are welcome —
bug reports, feature requests, documentation improvements, and code changes.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Commit Convention](#commit-convention)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md).
By participating, you agree to uphold it.

---

## Getting Started

1. **Fork** the repository on GitHub.
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/aws-ses-adapter.git
   cd aws-ses-adapter
   ```
3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/FabianMontoya/aws-ses-adapter.git
   ```

---

## Development Setup

This project uses [pnpm](https://pnpm.io/). Make sure you have it installed:

```bash
npm install -g pnpm
```

Install dependencies:

```bash
pnpm install
```

Available scripts:

| Script              | Description                       |
| ------------------- | --------------------------------- |
| `pnpm build`        | Compile TypeScript to `dist/`     |
| `pnpm build:watch`  | Watch mode build                  |
| `pnpm typecheck`    | Run TypeScript type checking      |
| `pnpm lint`         | Run ESLint                        |
| `pnpm lint:fix`     | Run ESLint with auto-fix          |
| `pnpm format`       | Format source files with Prettier |
| `pnpm format:check` | Check formatting without writing  |

---

## Project Structure

```
src/
├── index.ts      # Public API — singleton functions and re-exports
├── adapter.ts    # SesAdapter class — core email sending logic
├── client.ts     # AWS SES client factory
├── errors.ts     # Custom error classes
└── types.ts      # TypeScript interfaces and types
```

---

## Making Changes

1. Create a new branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Make your changes in `src/`.
3. Ensure the project builds and passes all checks:
   ```bash
   pnpm typecheck
   pnpm lint
   pnpm build
   ```
4. Update the [README](./README.md) if your change affects the public API or behavior.

---

## Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>
```

Common types:

| Type       | When to use                                     |
| ---------- | ----------------------------------------------- |
| `feat`     | New feature                                     |
| `fix`      | Bug fix                                         |
| `docs`     | Documentation changes only                      |
| `refactor` | Code change that is neither a fix nor a feature |
| `chore`    | Build process, dependency updates, config       |
| `test`     | Adding or updating tests                        |

Examples:

```
feat(adapter): add support for cc and bcc headers
fix(errors): preserve original error stack in SesSendError
docs(readme): add NestJS integration example
chore(deps): update @aws-sdk/client-ses to v3.600.0
```

---

## Submitting a Pull Request

1. Push your branch to your fork:
   ```bash
   git push origin feat/your-feature-name
   ```
2. Open a Pull Request against the `main` branch of this repository.
3. Fill in the PR description explaining **what** changed and **why**.
4. Make sure all checks pass (typecheck, lint, build).
5. A maintainer will review and provide feedback.

---

## Reporting Bugs

Open an issue at [GitHub Issues](https://github.com/FabianMontoya/aws-ses-adapter/issues) and include:

- A clear title and description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Node.js version and OS
- Relevant code snippet or error output

---

## Requesting Features

Open an issue with the `enhancement` label describing:

- The use case or problem you're trying to solve
- Your proposed API or behavior (if any)
- Any alternatives you've considered
