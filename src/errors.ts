/**
 * @module errors
 * Custom error classes for the aws-ses-adapter library.
 * All errors extend the native `Error` class and include a `name` property
 * suitable for programmatic error identification.
 */

/**
 * Thrown when an operation is attempted before the adapter has been initialized
 * via {@link init}.
 *
 * @example
 * ```ts
 * import { sendEmail } from '@fmontoya/aws-ses-adapter';
 *
 * // Calling sendEmail before init() throws this error
 * try {
 *   await sendEmail({ to: 'user@example.com', subject: 'Hi', text: 'Hello' });
 * } catch (err) {
 *   if (err instanceof SesNotInitializedError) {
 *     console.error('Call init() first');
 *   }
 * }
 * ```
 */
export class SesNotInitializedError extends Error {
  /** @override */
  readonly name = 'SesNotInitializedError' as const;

  constructor() {
    super(
      'SES Adapter has not been initialized. Call init() before using any adapter methods.',
    );
  }
}

/**
 * Thrown when the configuration provided to {@link init} is invalid or incomplete.
 * This typically happens when required credentials are missing from both the config
 * object and the environment variables.
 *
 * @example
 * ```ts
 * import { init } from '@fmontoya/aws-ses-adapter';
 *
 * try {
 *   init({}); // No region, no env vars set
 * } catch (err) {
 *   if (err instanceof SesConfigError) {
 *     console.error('Config error:', err.message);
 *   }
 * }
 * ```
 */
export class SesConfigError extends Error {
  /** @override */
  readonly name = 'SesConfigError' as const;

  /**
   * @param message - Description of the configuration issue.
   */
  constructor(message: string) {
    super(message);
  }
}

/**
 * Thrown when an email send operation fails at the AWS SES level.
 * The original AWS error is available via the `cause` property (ES2022+).
 *
 * @example
 * ```ts
 * import { sendEmail, SesSendError } from '@fmontoya/aws-ses-adapter';
 *
 * try {
 *   await sendEmail({ to: 'user@example.com', subject: 'Hi', text: 'Hello' });
 * } catch (err) {
 *   if (err instanceof SesSendError) {
 *     console.error('Send failed:', err.message);
 *     console.error('Original cause:', err.cause);
 *   }
 * }
 * ```
 */
export class SesSendError extends Error {
  /** @override */
  readonly name = 'SesSendError' as const;

  /**
   * @param message - Description of the send failure.
   * @param cause   - The underlying error from AWS SDK.
   */
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
  }
}

/**
 * Thrown when {@link SendEmailOptions} are invalid, such as missing both
 * `html` and `text`, or having an invalid email address format.
 *
 * @example
 * ```ts
 * import { sendEmail, SesValidationError } from '@fmontoya/aws-ses-adapter';
 *
 * try {
 *   // Missing both html and text
 *   await sendEmail({ to: 'user@example.com', subject: 'Hi' });
 * } catch (err) {
 *   if (err instanceof SesValidationError) {
 *     console.error('Validation error:', err.message);
 *   }
 * }
 * ```
 */
export class SesValidationError extends Error {
  /** @override */
  readonly name = 'SesValidationError' as const;

  /**
   * @param message - Description of the validation failure.
   */
  constructor(message: string) {
    super(message);
  }
}
