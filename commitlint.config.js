/**
 * Commitlint Configuration for aws-ses-adapter
 *
 * This configuration enforces the Conventional Commits format:
 *
 *   <type>[optional scope][!]: <description>
 *
 * Allowed types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
 * Optional scope:  a noun in parentheses describing the section of the codebase, e.g. (auth)
 * Optional "!":    appended before the colon to indicate a breaking change
 * Description:     a short summary in present tense, must be non-empty
 *
 * Valid examples:
 *   ✓ feat: add SES template support
 *   ✓ fix(client): handle missing region configuration
 *   ✓ chore(deps): update @aws-sdk/client-ses
 *   ✓ refactor!: rename SendEmailOptions to SesEmailOptions
 *   ✓ docs: update README usage section
 *
 * Invalid examples:
 *   ✗ feat:missing space after colon
 *   ✗ fix(client):
 *   ✗ random commit message
 *   ✗ WIP: something
 *
 * AUTOMATIC COMMITS IGNORED:
 * The following commit types are automatically ignored (will not be validated):
 *   - Merge commits (Merge pull request, Merge branch, etc.)
 *   - Revert commits
 *   - Version tag commits
 *   - Automatic merge commits
 *
 * This ensures that automated processes like merges from GitHub won't be blocked.
 */

module.exports = {
  // Extend the conventional config to get default ignores
  extends: ['@commitlint/config-conventional'],

  // Keep default ignores enabled to skip merge commits, reverts, etc.
  // See: https://github.com/conventional-changelog/commitlint/blob/master/@commitlint/is-ignored/src/defaults.ts
  defaultIgnores: true,

  // Custom plugin with our validation rule
  plugins: [
    {
      rules: {
        'fmontoya-commit-format': parsed => {
          const { header } = parsed;

          // Pattern: Conventional commits — <type>[optional scope][!]: <description>
          const conventionalPattern =
            /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([^)]+\))?!?:\s+.+$/;

          if (!conventionalPattern.test(header)) {
            return [
              false,
              'Commit message must follow the Conventional Commit format:\n' +
                '  <type>[optional scope][!]: <description>\n\n' +
                '  Allowed types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert\n\n' +
                '  Examples:\n' +
                '    feat(client): add retry support\n' +
                '    fix: handle missing region configuration\n' +
                '    chore(deps): update @aws-sdk/client-ses\n' +
                '    refactor!: rename SendEmailOptions to SesEmailOptions\n',
            ];
          }

          return [true];
        },
      },
    },
  ],

  // Configure rules
  rules: {
    'type-enum': [0], // Disable built-in type-enum — type validation is handled by our custom rule
    'type-empty': [0], // Disable built-in type-empty — covered by our custom rule
    'subject-empty': [0], // Disable built-in subject-empty — covered by our custom rule

    // Apply our custom validation rule as an error (level 2)
    'fmontoya-commit-format': [2, 'always'],

    // Enforce a maximum commit header length
    'header-max-length': [2, 'always', 100], // Commit header max 100 chars
    'body-max-line-length': [1, 'always', 1000], // Warn if body lines exceed 1000 chars
  },

  // Custom help URL for your project
  helpUrl: 'https://www.conventionalcommits.org/en/v1.0.0/',
};
