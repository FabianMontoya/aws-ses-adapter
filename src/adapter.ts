/**
 * @module adapter
 * Core SesAdapter class that wraps the AWS SES client and provides
 * simplified email sending methods.
 */

import type {
  SendEmailCommandInput,
  SendRawEmailCommandInput,
  SESClient,
} from '@aws-sdk/client-ses';
import { SendEmailCommand, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { buildSesClient } from './client';
import { SesConfigError, SesSendError, SesValidationError } from './errors';
import type {
  EmailAttachment,
  ResolvedSesAdapterConfig,
  SendEmailOptions,
  SendEmailResult,
  SendEmailWithAttachmentsOptions,
  SesAdapterConfig,
} from './types';

/**
 * Resolves the adapter configuration by merging user-provided values with
 * environment variable fallbacks.
 *
 * @param config - Optional user-provided configuration.
 * @returns The resolved configuration with all required fields populated.
 * @throws {SesConfigError} When required fields cannot be resolved from config or env vars.
 *
 * @internal
 */
function resolveConfig(
  config: SesAdapterConfig = {},
): ResolvedSesAdapterConfig {
  const region = config.region ?? process.env['AWS_SES_REGION'];
  const accessKeyId = config.accessKeyId ?? process.env['AWS_ACCESS_KEY_ID'];
  const secretAccessKey =
    config.secretAccessKey ?? process.env['AWS_SECRET_ACCESS_KEY'];
  const defaultFrom = config.defaultFrom ?? process.env['AWS_SES_FROM_EMAIL'];

  if (!region) {
    throw new SesConfigError(
      'AWS SES region is required. Provide it via config.region or the AWS_SES_REGION environment variable.',
    );
  }
  if (!accessKeyId) {
    throw new SesConfigError(
      'AWS access key ID is required. Provide it via config.accessKeyId or the AWS_ACCESS_KEY_ID environment variable.',
    );
  }
  if (!secretAccessKey) {
    throw new SesConfigError(
      'AWS secret access key is required. Provide it via config.secretAccessKey or the AWS_SECRET_ACCESS_KEY environment variable.',
    );
  }

  return { region, accessKeyId, secretAccessKey, defaultFrom };
}

/**
 * Normalizes a value that can be a single string or an array of strings
 * into a guaranteed array.
 *
 * @param value - A string or array of strings.
 * @returns An array of strings.
 *
 * @internal
 */
function toArray(value: string | string[]): string[] {
  return Array.isArray(value) ? value : [value];
}

/**
 * Encodes a MIME header value using RFC 2047 Base64 encoded-word syntax
 * when the value contains non-ASCII characters.
 *
 * @param value - The raw header value (e.g. a subject line).
 * @returns The value as-is if it is pure ASCII, otherwise `=?UTF-8?B?...?=`.
 *
 * @internal
 */
function encodeHeaderValue(value: string): string {
  // If no non-ASCII characters are present, return as-is
  if (!/[\u0080-\uFFFF]/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, 'utf-8').toString('base64')}?=`;
}

/**
 * Builds a multipart/mixed MIME email message ready to be sent via
 * `SendRawEmailCommand`.
 *
 * The body section uses multipart/alternative when both `html` and `text` are
 * supplied so that email clients can choose the best representation.
 *
 * @internal
 */
function buildMimeMessage(
  options: SendEmailWithAttachmentsOptions,
  from: string,
): string {
  const mixedBoundary = `----=_Mixed_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const altBoundary = `----=_Alt_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const lines: string[] = [];

  // RFC 2822 headers
  lines.push(`From: ${from}`);
  lines.push(`To: ${toArray(options.to).join(', ')}`);
  if (options.cc) lines.push(`Cc: ${toArray(options.cc).join(', ')}`);
  if (options.bcc) lines.push(`Bcc: ${toArray(options.bcc).join(', ')}`);
  if (options.replyTo)
    lines.push(`Reply-To: ${toArray(options.replyTo).join(', ')}`);
  lines.push(`Subject: ${encodeHeaderValue(options.subject)}`);
  lines.push('MIME-Version: 1.0');
  lines.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`);
  lines.push('');

  // ── Body part ────────────────────────────────────────────────────────────
  if (options.html && options.text) {
    // Both formats: wrap in multipart/alternative
    lines.push(`--${mixedBoundary}`);
    lines.push(
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    );
    lines.push('');

    lines.push(`--${altBoundary}`);
    lines.push('Content-Type: text/plain; charset=UTF-8');
    lines.push('Content-Transfer-Encoding: 8bit');
    lines.push('');
    lines.push(options.text);
    lines.push('');

    lines.push(`--${altBoundary}`);
    lines.push('Content-Type: text/html; charset=UTF-8');
    lines.push('Content-Transfer-Encoding: 8bit');
    lines.push('');
    lines.push(options.html);
    lines.push('');

    lines.push(`--${altBoundary}--`);
    lines.push('');
  } else if (options.html) {
    lines.push(`--${mixedBoundary}`);
    lines.push('Content-Type: text/html; charset=UTF-8');
    lines.push('Content-Transfer-Encoding: 8bit');
    lines.push('');
    lines.push(options.html);
    lines.push('');
  } else if (options.text) {
    lines.push(`--${mixedBoundary}`);
    lines.push('Content-Type: text/plain; charset=UTF-8');
    lines.push('Content-Transfer-Encoding: 8bit');
    lines.push('');
    lines.push(options.text);
    lines.push('');
  }

  // ── Attachment parts ─────────────────────────────────────────────────────
  for (const attachment of options.attachments) {
    const encoded = encodeAttachment(attachment);
    const safeName = attachment.filename.replace(/"/g, '');

    lines.push(`--${mixedBoundary}`);
    lines.push(`Content-Type: ${attachment.contentType}; name="${safeName}"`);
    lines.push('Content-Transfer-Encoding: base64');
    lines.push(`Content-Disposition: attachment; filename="${safeName}"`);
    lines.push('');
    // RFC 2045: base64 lines must not exceed 76 characters
    lines.push(encoded.match(/.{1,76}/g)?.join('\r\n') ?? encoded);
    lines.push('');
  }

  lines.push(`--${mixedBoundary}--`);

  return lines.join('\r\n');
}

/**
 * Encodes an attachment's content as a base64 string.
 *
 * @param attachment - The attachment to encode.
 * @returns Base64-encoded string.
 *
 * @internal
 */
function encodeAttachment(attachment: EmailAttachment): string {
  if (Buffer.isBuffer(attachment.content)) {
    return attachment.content.toString('base64');
  }
  return Buffer.from(attachment.content).toString('base64');
}

/**
 * Core adapter class that wraps the AWS SES client and provides a simplified
 * API for sending emails.
 *
 * This class is not meant to be instantiated directly by consumers.
 * Use the singleton functions exported from the main module instead.
 *
 * @see {@link init} to initialize the singleton.
 * @see {@link sendEmail} to send a standard email.
 * @see {@link sendRawEmail} to send a raw MIME email.
 */
export class SesAdapter {
  /** @internal */
  private readonly sesClient: SESClient;

  /** @internal */
  private readonly config: ResolvedSesAdapterConfig;

  /**
   * Creates a new SesAdapter instance.
   *
   * @param userConfig - Optional configuration. Missing fields fall back to environment variables.
   * @throws {SesConfigError} When required configuration fields are missing.
   */
  constructor(userConfig: SesAdapterConfig = {}) {
    this.config = resolveConfig(userConfig);
    this.sesClient = buildSesClient(this.config);
  }

  /**
   * Validates that at least one body content field (`html` or `text`) is provided.
   *
   * @param options - Object containing optional `html` and `text` fields.
   * @throws {SesValidationError} When neither field is present.
   *
   * @internal
   */
  private validateBodyOptions(options: { html?: string; text?: string }): void {
    if (!options.html && !options.text) {
      throw new SesValidationError(
        'At least one of "html" or "text" must be provided.',
      );
    }
  }

  /**
   * Resolves the sender address from the per-call option or the adapter default.
   *
   * @param from - The per-call "from" address, if provided.
   * @returns The resolved sender address.
   * @throws {SesValidationError} When no sender address can be determined.
   *
   * @internal
   */
  private resolveFrom(from?: string): string {
    const resolved = from ?? this.config.defaultFrom;
    if (!resolved) {
      throw new SesValidationError(
        'A sender address is required. Provide "from" in the options or set "defaultFrom" during init().',
      );
    }
    return resolved;
  }

  /**
   * Dispatches a raw MIME message via `SendRawEmailCommand`.
   *
   * @param rawMessage - The raw MIME string to send.
   * @param errorContext - Human-readable context prepended to error messages.
   * @returns A promise resolving to a {@link SendEmailResult}.
   * @throws {SesSendError} When the AWS SES API call fails.
   *
   * @internal
   */
  private async dispatchRawEmail(
    rawMessage: string,
    errorContext: string,
  ): Promise<SendEmailResult> {
    const params: SendRawEmailCommandInput = {
      RawMessage: {
        Data: Buffer.from(rawMessage),
      },
    };

    try {
      const command = new SendRawEmailCommand(params);
      const response = await this.sesClient.send(command);

      return {
        success: true,
        messageId: response.MessageId,
      };
    } catch (error) {
      throw new SesSendError(
        `${errorContext}: ${error instanceof Error ? error.message : String(error)}`,
        error,
      );
    }
  }

  /**
   * Sends an email using AWS SES.
   *
   * At least one of `options.html` or `options.text` must be provided.
   * If `options.from` is not specified, the `defaultFrom` configured during
   * initialization is used. If neither is available, the call throws.
   *
   * @param options - Email sending options.
   * @returns A promise resolving to a {@link SendEmailResult}.
   * @throws {SesValidationError} When required email fields are missing or invalid.
   * @throws {SesSendError} When the AWS SES API call fails.
   *
   * @example
   * ```ts
   * const result = await adapter.sendEmail({
   *   to: ['alice@example.com', 'bob@example.com'],
   *   subject: 'Hello!',
   *   html: '<p>Hello World</p>',
   *   text: 'Hello World',
   *   cc: 'manager@example.com',
   * });
   * ```
   */
  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    this.validateBodyOptions(options);

    const from = this.resolveFrom(options.from);

    const toAddresses = toArray(options.to);

    const params: SendEmailCommandInput = {
      Source: from,
      Destination: {
        ToAddresses: toAddresses,
        CcAddresses: options.cc ? toArray(options.cc) : undefined,
        BccAddresses: options.bcc ? toArray(options.bcc) : undefined,
      },
      Message: {
        Subject: {
          Data: options.subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: options.html
            ? { Data: options.html, Charset: 'UTF-8' }
            : undefined,
          Text: options.text
            ? { Data: options.text, Charset: 'UTF-8' }
            : undefined,
        },
      },
      ReplyToAddresses: options.replyTo ? toArray(options.replyTo) : undefined,
    };

    try {
      const command = new SendEmailCommand(params);
      const response = await this.sesClient.send(command);

      return {
        success: true,
        messageId: response.MessageId,
      };
    } catch (error) {
      throw new SesSendError(
        `Failed to send email to ${toAddresses.join(', ')}: ${error instanceof Error ? error.message : String(error)}`,
        error,
      );
    }
  }

  /**
   * Sends a raw MIME email using AWS SES.
   *
   * Use this method when you need full control over the email format, such as
   * sending emails with attachments or custom headers.
   *
   * @param rawMessage - The raw MIME email message as a string.
   * @returns A promise resolving to a {@link SendEmailResult}.
   * @throws {SesValidationError} When the raw message is empty.
   * @throws {SesSendError} When the AWS SES API call fails.
   *
   * @example
   * ```ts
   * const mimeMessage = [
   *   'From: sender@example.com',
   *   'To: recipient@example.com',
   *   'Subject: Test',
   *   'MIME-Version: 1.0',
   *   'Content-Type: text/plain',
   *   '',
   *   'Hello World',
   * ].join('\r\n');
   *
   * const result = await adapter.sendRawEmail(mimeMessage);
   * ```
   */
  async sendRawEmail(rawMessage: string): Promise<SendEmailResult> {
    if (!rawMessage || rawMessage.trim().length === 0) {
      throw new SesValidationError('rawMessage cannot be empty.');
    }

    return this.dispatchRawEmail(rawMessage, 'Failed to send raw email');
  }

  /**
   * Sends an email with one or more file attachments using AWS SES.
   *
   * Internally builds a multipart/mixed MIME message and dispatches it via
   * `SendRawEmailCommand`, giving you full attachment support without needing
   * to craft raw MIME by hand.
   *
   * At least one of `options.html` or `options.text` must be provided.
   * The `options.attachments` array must contain at least one item.
   *
   * @param options - Email options including the attachments array.
   * @returns A promise resolving to a {@link SendEmailResult}.
   * @throws {SesValidationError} When required fields are missing or invalid.
   * @throws {SesSendError} When the AWS SES API call fails.
   *
   * @example
   * ```ts
   * const result = await adapter.sendEmailWithAttachments({
   *   to: 'alice@example.com',
   *   subject: 'Your invoice',
   *   html: '<p>Please find the invoice attached.</p>',
   *   attachments: [
   *     {
   *       filename: 'invoice.pdf',
   *       content: fs.readFileSync('./invoice.pdf'),
   *       contentType: 'application/pdf',
   *     },
   *   ],
   * });
   * ```
   */
  async sendEmailWithAttachments(
    options: SendEmailWithAttachmentsOptions,
  ): Promise<SendEmailResult> {
    this.validateBodyOptions(options);

    if (!options.attachments || options.attachments.length === 0) {
      throw new SesValidationError(
        'At least one attachment must be provided in SendEmailWithAttachmentsOptions.attachments.',
      );
    }

    const from = this.resolveFrom(options.from);
    const toAddresses = toArray(options.to);
    const rawMessage = buildMimeMessage(options, from);

    return this.dispatchRawEmail(
      rawMessage,
      `Failed to send email with attachments to ${toAddresses.join(', ')}`,
    );
  }

  /**
   * Returns whether the adapter has a default "From" address configured.
   *
   * @returns `true` if a default from address is available.
   *
   * @example
   * ```ts
   * if (adapter.hasDefaultFrom()) {
   *   console.log('Default from:', adapter.getDefaultFrom());
   * }
   * ```
   */
  hasDefaultFrom(): boolean {
    return !!this.config.defaultFrom;
  }

  /**
   * Returns the default "From" email address, or `undefined` if not set.
   *
   * @returns The default sender address, or `undefined`.
   *
   * @example
   * ```ts
   * const from = adapter.getDefaultFrom();
   * // => 'noreply@example.com' or undefined
   * ```
   */
  getDefaultFrom(): string | undefined {
    return this.config.defaultFrom;
  }

  /**
   * Returns the AWS region the adapter is configured to use.
   *
   * @returns The AWS region string.
   *
   * @example
   * ```ts
   * console.log(adapter.getRegion()); // => 'us-east-1'
   * ```
   */
  getRegion(): string {
    return this.config.region;
  }
}
