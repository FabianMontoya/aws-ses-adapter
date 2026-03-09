/**
 * @module types
 * Core types and interfaces for the aws-ses-adapter library.
 */

/**
 * Configuration options for initializing the SES Adapter.
 * All credential fields are optional and will fall back to the corresponding
 * environment variables if not provided.
 *
 * @example
 * ```ts
 * // Recommended: use the credentials object
 * const config: SesAdapterConfig = {
 *   region: 'us-east-1',
 *   credentials: {
 *     accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
 *     secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
 *   },
 *   defaultFrom: 'noreply@example.com',
 * };
 * ```
 */
export interface SesAdapterConfig {
  /**
   * AWS region where SES is configured.
   * Falls back to the `AWS_SES_REGION` environment variable if not provided.
   */
  region?: string;

  /**
   * AWS credentials for authentication.
   * Takes precedence over the deprecated top-level `accessKeyId` and `secretAccessKey` fields.
   *
   * @example
   * ```ts
   * credentials: {
   *   accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
   *   secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
   * }
   * ```
   */
  credentials?: {
    /** AWS access key ID. Falls back to the `AWS_ACCESS_KEY_ID` environment variable if not provided. */
    accessKeyId: string;
    /** AWS secret access key. Falls back to the `AWS_SECRET_ACCESS_KEY` environment variable if not provided. */
    secretAccessKey: string;
  };

  /**
   * AWS access key ID for authentication.
   * Falls back to the `AWS_ACCESS_KEY_ID` environment variable if not provided.
   *
   * @deprecated Use `credentials.accessKeyId` instead.
   */
  accessKeyId?: string;

  /**
   * AWS secret access key for authentication.
   * Falls back to the `AWS_SECRET_ACCESS_KEY` environment variable if not provided.
   *
   * @deprecated Use `credentials.secretAccessKey` instead.
   */
  secretAccessKey?: string;

  /**
   * Default "From" email address used when no `from` is specified in {@link SendEmailOptions}.
   * Falls back to the `AWS_SES_FROM_EMAIL` environment variable if not provided.
   * This field is optional — emails can still provide their own `from` address.
   */
  defaultFrom?: string;
}

/**
 * A file attachment to include in an email sent via {@link sendEmailWithAttachments}.
 *
 * @example
 * ```ts
 * const attachment: EmailAttachment = {
 *   filename: 'report.pdf',
 *   content: fs.readFileSync('./report.pdf'),
 *   contentType: 'application/pdf',
 * };
 * ```
 */
export interface EmailAttachment {
  /**
   * The filename shown to the recipient (e.g. `'report.pdf'`).
   */
  filename: string;

  /**
   * The attachment content. Use a `Buffer` for binary files (images, PDFs, etc.)
   * or a `string` for plain text files.
   */
  content: Buffer | string;

  /**
   * MIME content type of the attachment (e.g. `'application/pdf'`, `'image/png'`).
   */
  contentType: string;
}

/**
 * Options for sending an email with attachments via SES.
 * Extends {@link SendEmailOptions} with a required `attachments` array.
 * At least one of `html` or `text` must be provided, plus at least one attachment.
 *
 * @example
 * ```ts
 * const options: SendEmailWithAttachmentsOptions = {
 *   to: 'user@example.com',
 *   subject: 'Your report',
 *   html: '<p>Please find the report attached.</p>',
 *   attachments: [
 *     { filename: 'report.pdf', content: pdfBuffer, contentType: 'application/pdf' },
 *   ],
 * };
 * ```
 */
export interface SendEmailWithAttachmentsOptions extends SendEmailOptions {
  /**
   * List of file attachments to include in the email.
   * Must contain at least one item.
   */
  attachments: EmailAttachment[];
}

/**
 * Options for sending an email via SES.
 * At least one of `html` or `text` must be provided.
 *
 * @example
 * ```ts
 * const options: SendEmailOptions = {
 *   to: 'user@example.com',
 *   subject: 'Hello!',
 *   html: '<h1>Hello World</h1>',
 *   cc: ['manager@example.com'],
 * };
 * ```
 */
export interface SendEmailOptions {
  /**
   * Recipient email address or array of addresses.
   */
  to: string | string[];

  /**
   * Subject line of the email.
   */
  subject: string;

  /**
   * HTML body of the email.
   * At least one of `html` or `text` must be provided.
   */
  html?: string;

  /**
   * Plain text body of the email.
   * At least one of `html` or `text` must be provided.
   */
  text?: string;

  /**
   * Sender email address. Overrides the `defaultFrom` configured during initialization.
   * Must be a verified SES identity.
   */
  from?: string;

  /**
   * Reply-To email address or array of addresses.
   */
  replyTo?: string | string[];

  /**
   * CC email address or array of addresses.
   */
  cc?: string | string[];

  /**
   * BCC email address or array of addresses.
   */
  bcc?: string | string[];
}

/**
 * Result object returned by {@link sendEmail}, {@link sendEmailWithAttachments},
 * and {@link sendRawEmail} on success.
 *
 * All send methods throw a typed error on failure (see {@link SesSendError},
 * {@link SesValidationError}), so a returned `SendEmailResult` always represents
 * a successful send.
 *
 * @example
 * ```ts
 * const result = await sendEmail(options);
 * console.log('Message ID:', result.messageId);
 * ```
 */
export interface SendEmailResult {
  /**
   * Always `true` for a returned result — failures are thrown as errors.
   */
  success: true;

  /**
   * The SES message ID returned by AWS.
   */
  messageId?: string;
}

/**
 * Resolved configuration after merging user-provided options with environment variables.
 * All required fields are guaranteed to be defined.
 *
 * @internal
 */
export interface ResolvedSesAdapterConfig {
  /** AWS region. */
  region: string;
  /** AWS access key ID. */
  accessKeyId: string;
  /** AWS secret access key. */
  secretAccessKey: string;
  /** Optional default sender address. */
  defaultFrom?: string;
}
