/**
 * @module aws-ses-adapter
 *
 * A lightweight adapter that simplifies the AWS SES email sending API for Node.js.
 *
 * ## Quick Start
 *
 * **1. Initialize once** (at application startup):
 * ```ts
 * import { init } from 'aws-ses-adapter';
 *
 * init({
 *   region: 'us-east-1',
 *   credentials: {
 *     accessKeyId: 'YOUR_KEY',
 *     secretAccessKey: 'YOUR_SECRET',
 *   },
 *   defaultFrom: 'noreply@example.com',
 * });
 * ```
 *
 * **2. Use anywhere** in your application:
 * ```ts
 * import { sendEmail } from 'aws-ses-adapter';
 *
 * await sendEmail({
 *   to: 'user@example.com',
 *   subject: 'Welcome!',
 *   html: '<h1>Welcome</h1>',
 * });
 * ```
 *
 * ## Environment Variables
 *
 * If credentials are not passed to `init()`, the adapter reads:
 * - `AWS_SES_REGION`
 * - `AWS_ACCESS_KEY_ID`
 * - `AWS_SECRET_ACCESS_KEY`
 * - `AWS_SES_FROM_EMAIL` (optional default sender)
 */

import { SesAdapter } from './adapter';
import { SesNotInitializedError } from './errors';
import type {
  SendEmailOptions,
  SendEmailResult,
  SendEmailWithAttachmentsOptions,
  SesAdapterConfig,
} from './types';

// ─── Singleton state ──────────────────────────────────────────────────────────

/** @internal */
let _instance: SesAdapter | null = null;

/**
 * Returns the current singleton instance.
 * @throws {SesNotInitializedError} If `init()` has not been called yet.
 * @internal
 */
function getInstance(): SesAdapter {
  if (!_instance) {
    throw new SesNotInitializedError();
  }
  return _instance;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initializes the SES Adapter singleton.
 *
 * Must be called **once** before any other function in this module.
 * Calling `init()` again will replace the existing singleton instance,
 * which is useful for reconfiguration during testing.
 *
 * Credentials are resolved in the following order:
 * 1. `config.credentials.accessKeyId` / `config.credentials.secretAccessKey`
 * 2. `config.accessKeyId` / `config.secretAccessKey` _(deprecated)_
 * 3. Environment variables (`AWS_SES_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
 *
 * @param config - Optional configuration. Omit any field to fall back to environment variables.
 * @throws {SesConfigError} When required credentials cannot be resolved.
 *
 * @example
 * ```ts
 * // Using explicit credentials
 * init({
 *   region: 'us-east-1',
 *   credentials: {
 *     accessKeyId: process.env.MY_KEY_ID,
 *     secretAccessKey: process.env.MY_SECRET,
 *   },
 *   defaultFrom: 'no-reply@myapp.com',
 * });
 *
 * // Relying entirely on environment variables
 * init();
 * ```
 */
export function init(config: SesAdapterConfig = {}): void {
  _instance = new SesAdapter(config);
}

/**
 * Sends an email using the initialized SES Adapter.
 *
 * At least one of `options.html` or `options.text` must be provided.
 * If `options.from` is not specified, the `defaultFrom` set during {@link init} is used.
 *
 * @param options - Email sending options.
 * @returns A promise resolving to a {@link SendEmailResult}.
 * @throws {SesNotInitializedError} If {@link init} has not been called.
 * @throws {SesValidationError} When required email fields are missing or invalid.
 * @throws {SesSendError} When the AWS SES API call fails.
 *
 * @example
 * ```ts
 * import { sendEmail } from 'aws-ses-adapter';
 *
 * const result = await sendEmail({
 *   to: 'alice@example.com',
 *   subject: 'Hello Alice',
 *   html: '<p>Hi Alice!</p>',
 *   text: 'Hi Alice!',
 *   cc: 'manager@example.com',
 *   bcc: ['audit@example.com'],
 *   replyTo: 'support@example.com',
 * });
 *
 * console.log(result.messageId);
 * ```
 */
export async function sendEmail(
  options: SendEmailOptions,
): Promise<SendEmailResult> {
  return getInstance().sendEmail(options);
}

/**
 * Sends an email with one or more file attachments using the initialized SES Adapter.
 *
 * Internally builds a multipart/mixed MIME message, so you don't need to
 * construct raw MIME yourself. At least one of `options.html` or `options.text`
 * must be provided, and `options.attachments` must contain at least one item.
 *
 * @param options - Email options including the attachments array.
 * @returns A promise resolving to a {@link SendEmailResult}.
 * @throws {SesNotInitializedError} If {@link init} has not been called.
 * @throws {SesValidationError} When required fields are missing or invalid.
 * @throws {SesSendError} When the AWS SES API call fails.
 *
 * @example
 * ```ts
 * import { sendEmailWithAttachments } from 'aws-ses-adapter';
 * import { readFileSync } from 'fs';
 *
 * const result = await sendEmailWithAttachments({
 *   to: 'alice@example.com',
 *   subject: 'Your invoice',
 *   html: '<p>Please find the invoice attached.</p>',
 *   attachments: [
 *     {
 *       filename: 'invoice.pdf',
 *       content: readFileSync('./invoice.pdf'),
 *       contentType: 'application/pdf',
 *     },
 *   ],
 * });
 *
 * console.log(result.messageId);
 * ```
 */
export async function sendEmailWithAttachments(
  options: SendEmailWithAttachmentsOptions,
): Promise<SendEmailResult> {
  return getInstance().sendEmailWithAttachments(options);
}

/**
 * Sends a raw MIME email using the initialized SES Adapter.
 *
 * Use this when you need full control over the email, such as including
 * attachments or custom MIME headers.
 *
 * @param rawMessage - The raw MIME email message as a string.
 * @returns A promise resolving to a {@link SendEmailResult}.
 * @throws {SesNotInitializedError} If {@link init} has not been called.
 * @throws {SesValidationError} When the raw message is empty.
 * @throws {SesSendError} When the AWS SES API call fails.
 *
 * @example
 * ```ts
 * import { sendRawEmail } from 'aws-ses-adapter';
 *
 * const mime = [
 *   'From: sender@example.com',
 *   'To: recipient@example.com',
 *   'Subject: File attached',
 *   'MIME-Version: 1.0',
 *   'Content-Type: text/plain',
 *   '',
 *   'Please find the attachment.',
 * ].join('\r\n');
 *
 * const result = await sendRawEmail(mime);
 * ```
 */
export async function sendRawEmail(
  rawMessage: string,
): Promise<SendEmailResult> {
  return getInstance().sendRawEmail(rawMessage);
}

/**
 * Returns whether the singleton has been initialized via {@link init}.
 *
 * @returns `true` if `init()` has been called successfully.
 *
 * @example
 * ```ts
 * import { isInitialized } from 'aws-ses-adapter';
 *
 * if (!isInitialized()) {
 *   init();
 * }
 * ```
 */
export function isInitialized(): boolean {
  return _instance !== null;
}

/**
 * Returns whether a default "From" address is configured in the singleton.
 *
 * @returns `true` if a default sender address is set.
 * @throws {SesNotInitializedError} If {@link init} has not been called.
 *
 * @example
 * ```ts
 * import { hasDefaultFrom } from 'aws-ses-adapter';
 *
 * console.log(hasDefaultFrom()); // => true
 * ```
 */
export function hasDefaultFrom(): boolean {
  return getInstance().hasDefaultFrom();
}

/**
 * Returns the default "From" email address configured in the singleton,
 * or `undefined` if none was set.
 *
 * @returns The default sender address, or `undefined`.
 * @throws {SesNotInitializedError} If {@link init} has not been called.
 *
 * @example
 * ```ts
 * import { getDefaultFrom } from 'aws-ses-adapter';
 *
 * const from = getDefaultFrom();
 * // => 'noreply@example.com' or undefined
 * ```
 */
export function getDefaultFrom(): string | undefined {
  return getInstance().getDefaultFrom();
}

/**
 * Returns the AWS region the singleton is configured to use.
 *
 * @returns The AWS region string (e.g. `'us-east-1'`).
 * @throws {SesNotInitializedError} If {@link init} has not been called.
 *
 * @example
 * ```ts
 * import { getRegion } from 'aws-ses-adapter';
 *
 * console.log(getRegion()); // => 'us-east-1'
 * ```
 */
export function getRegion(): string {
  return getInstance().getRegion();
}

// ─── Re-exports ───────────────────────────────────────────────────────────────

/**
 * Re-export the core adapter class for advanced use cases such as
 * creating multiple independent instances or building framework integrations
 * (e.g., a NestJS module).
 */
export { SesAdapter } from './adapter';

/** Re-export all custom error classes for consumer-side `instanceof` checks. */
export {
  SesConfigError,
  SesNotInitializedError,
  SesSendError,
  SesValidationError,
} from './errors';

/** Re-export all public types and interfaces. */
export type {
  EmailAttachment,
  SendEmailOptions,
  SendEmailResult,
  SendEmailWithAttachmentsOptions,
  SesAdapterConfig,
} from './types';
