# @fmontoya/aws-ses-adapter

A lightweight TypeScript adapter that simplifies the [AWS SES](https://aws.amazon.com/ses/) email sending API for Node.js.

- **Zero-boilerplate** — one `init()` call, then just `sendEmail()`
- **Attachments built-in** — multipart MIME constructed for you automatically
- **Typed errors** — four distinct error classes for precise error handling
- **ESM + CJS** — works in both module systems out of the box
- **Env-var fallbacks** — credentials can come from environment variables

## Table of Contents

- [@fmontoya/aws-ses-adapter](#fmontoyaaws-ses-adapter)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Prerequisites](#prerequisites)
  - [Quick Start](#quick-start)
    - [1. Initialize once (at application startup)](#1-initialize-once-at-application-startup)
    - [2. Send emails anywhere in your app](#2-send-emails-anywhere-in-your-app)
  - [Configuration](#configuration)
    - [Via `init()` options](#via-init-options)
    - [Via environment variables](#via-environment-variables)
  - [API Reference](#api-reference)
    - [`init(config?)`](#initconfig)
    - [`sendEmail(options)`](#sendemailoptions)
    - [`sendEmailWithAttachments(options)`](#sendemailwithattachmentsoptions)
    - [`sendRawEmail(rawMessage)`](#sendrawemailrawmessage)
    - [Utility functions](#utility-functions)
    - [`SesAdapter` class](#sesadapter-class)
  - [Error Handling](#error-handling)
  - [Usage Examples](#usage-examples)
    - [Express.js](#expressjs)
    - [NestJS](#nestjs)
  - [TypeScript Types](#typescript-types)
  - [License](#license)

---

## Installation

```bash
# npm
npm install @fmontoya/aws-ses-adapter

# pnpm
pnpm add @fmontoya/aws-ses-adapter

# yarn
yarn add @fmontoya/aws-ses-adapter
```

> **Requires Node.js 20 or later.**

---

## Prerequisites

1. An [AWS account](https://aws.amazon.com/) with SES enabled in your chosen region.
2. A **verified sender identity** (domain or email address) in SES.
3. AWS credentials with at least the `ses:SendEmail` and `ses:SendRawEmail` IAM permissions.

---

## Quick Start

### 1. Initialize once (at application startup)

```ts
import { init } from '@fmontoya/aws-ses-adapter';

init({
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  defaultFrom: 'noreply@example.com',
});
```

### 2. Send emails anywhere in your app

```ts
import { sendEmail } from '@fmontoya/aws-ses-adapter';

const result = await sendEmail({
  to: 'user@example.com',
  subject: 'Welcome!',
  html: '<h1>Welcome to our platform!</h1>',
  text: 'Welcome to our platform!',
});

console.log('Sent! Message ID:', result.messageId);
```

---

## Configuration

### Via `init()` options

| Option            | Type     | Required | Description                                                   |
| ----------------- | -------- | -------- | ------------------------------------------------------------- |
| `region`          | `string` | Yes\*    | AWS region where SES is configured (e.g. `us-east-1`).        |
| `accessKeyId`     | `string` | Yes\*    | AWS access key ID.                                            |
| `secretAccessKey` | `string` | Yes\*    | AWS secret access key.                                        |
| `defaultFrom`     | `string` | No       | Default "From" address used when `from` is omitted per-email. |

\* Required unless the corresponding environment variable is set.

### Via environment variables

If a field is not provided to `init()`, the adapter automatically falls back to these environment variables:

| Variable                | Corresponds to    |
| ----------------------- | ----------------- |
| `AWS_SES_REGION`        | `region`          |
| `AWS_ACCESS_KEY_ID`     | `accessKeyId`     |
| `AWS_SECRET_ACCESS_KEY` | `secretAccessKey` |
| `AWS_SES_FROM_EMAIL`    | `defaultFrom`     |

Calling `init()` with no arguments will rely entirely on environment variables:

```ts
// All credentials are read from environment variables
init();
```

---

## API Reference

### `init(config?)`

Initializes the adapter singleton. Must be called **once** before any send function.

```ts
import { init } from '@fmontoya/aws-ses-adapter';

init({
  region: 'us-east-1',
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  defaultFrom: 'noreply@example.com',
});
```

Calling `init()` again replaces the existing singleton — useful for reconfiguration in tests.

**Throws:** `SesConfigError` when required credentials cannot be resolved.

---

### `sendEmail(options)`

Sends a standard HTML and/or plain-text email.

```ts
const result = await sendEmail({
  to: 'alice@example.com', // string or string[]
  subject: 'Hello Alice',
  html: '<p>Hi Alice!</p>',
  text: 'Hi Alice!',
  from: 'sender@example.com', // optional — overrides defaultFrom
  replyTo: 'support@example.com', // optional — string or string[]
  cc: ['manager@example.com'], // optional — string or string[]
  bcc: 'audit@example.com', // optional — string or string[]
});
```

**Options (`SendEmailOptions`):**

| Field     | Type                 | Required | Description                                               |
| --------- | -------------------- | -------- | --------------------------------------------------------- |
| `to`      | `string \| string[]` | Yes      | Recipient(s).                                             |
| `subject` | `string`             | Yes      | Email subject line.                                       |
| `html`    | `string`             | Yes\*    | HTML body.                                                |
| `text`    | `string`             | Yes\*    | Plain-text body.                                          |
| `from`    | `string`             | No       | Sender address. Overrides the `defaultFrom` from `init`.. |
| `replyTo` | `string \| string[]` | No       | Reply-To address(es).                                     |
| `cc`      | `string \| string[]` | No       | CC address(es).                                           |
| `bcc`     | `string \| string[]` | No       | BCC address(es).                                          |

\* At least one of `html` or `text` is required.

**Returns:** `Promise<SendEmailResult>`

**Throws:** `SesNotInitializedError` | `SesValidationError` | `SesSendError`

---

### `sendEmailWithAttachments(options)`

Sends an email with one or more file attachments. The MIME message is constructed automatically.

```ts
import { sendEmailWithAttachments } from '@fmontoya/aws-ses-adapter';
import { readFileSync } from 'fs';

const result = await sendEmailWithAttachments({
  to: 'alice@example.com',
  subject: 'Your invoice',
  html: '<p>Please find the invoice attached.</p>',
  attachments: [
    {
      filename: 'invoice.pdf',
      content: readFileSync('./invoice.pdf'), // Buffer or string
      contentType: 'application/pdf',
    },
    {
      filename: 'notes.txt',
      content: 'Some plain text notes.',
      contentType: 'text/plain',
    },
  ],
});
```

**Additional field (`EmailAttachment`):**

| Field         | Type               | Required | Description                                      |
| ------------- | ------------------ | -------- | ------------------------------------------------ |
| `filename`    | `string`           | Yes      | Filename shown to the recipient.                 |
| `content`     | `Buffer \| string` | Yes      | File content. Use `Buffer` for binary files.     |
| `contentType` | `string`           | Yes      | MIME type (e.g. `application/pdf`, `image/png`). |

**Throws:** `SesNotInitializedError` | `SesValidationError` | `SesSendError`

---

### `sendRawEmail(rawMessage)`

Sends a fully-formed raw MIME message when you need complete control over the email format.

```ts
import { sendRawEmail } from '@fmontoya/aws-ses-adapter';

const mime = [
  'From: sender@example.com',
  'To: recipient@example.com',
  'Subject: Raw MIME email',
  'MIME-Version: 1.0',
  'Content-Type: text/plain; charset=UTF-8',
  '',
  'Hello from a raw MIME message.',
].join('\r\n');

const result = await sendRawEmail(mime);
```

**Throws:** `SesNotInitializedError` | `SesValidationError` | `SesSendError`

---

### Utility functions

```ts
import {
  isInitialized,
  hasDefaultFrom,
  getDefaultFrom,
  getRegion,
} from '@fmontoya/aws-ses-adapter';

isInitialized(); // boolean — true if init() has been called
hasDefaultFrom(); // boolean — true if a defaultFrom address is configured
getDefaultFrom(); // string | undefined — the configured defaultFrom address
getRegion(); // string — the configured AWS region, e.g. 'us-east-1'
```

---

### `SesAdapter` class

For advanced use cases — such as managing multiple independent instances or building framework integrations (e.g. NestJS modules) — you can instantiate `SesAdapter` directly:

```ts
import { SesAdapter } from '@fmontoya/aws-ses-adapter';

const adapter = new SesAdapter({
  region: 'eu-west-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  defaultFrom: 'noreply@myapp.com',
});

await adapter.sendEmail({
  to: 'user@example.com',
  subject: 'Hello!',
  html: '<p>Hello from a direct instance.</p>',
});
```

The class exposes the same methods as the singleton API: `sendEmail()`, `sendEmailWithAttachments()`, `sendRawEmail()`, `hasDefaultFrom()`, `getDefaultFrom()`, and `getRegion()`.

---

## Error Handling

All errors extend the native `Error` class and carry a stable `name` property for programmatic identification.

| Error class              | When it is thrown                                                     |
| ------------------------ | --------------------------------------------------------------------- |
| `SesNotInitializedError` | A send function is called before `init()`.                            |
| `SesConfigError`         | `init()` is called with missing/invalid credentials.                  |
| `SesValidationError`     | Required email fields are missing (e.g. no `html`/`text`, no `from`). |
| `SesSendError`           | The AWS SES API call fails. The original error is in `err.cause`.     |

```ts
import {
  sendEmail,
  SesNotInitializedError,
  SesConfigError,
  SesValidationError,
  SesSendError,
} from '@fmontoya/aws-ses-adapter';

try {
  await sendEmail({
    to: 'user@example.com',
    subject: 'Hi',
    html: '<p>Hello</p>',
  });
} catch (err) {
  if (err instanceof SesNotInitializedError) {
    console.error('Call init() before sending emails.');
  } else if (err instanceof SesConfigError) {
    console.error('Invalid configuration:', err.message);
  } else if (err instanceof SesValidationError) {
    console.error('Invalid email options:', err.message);
  } else if (err instanceof SesSendError) {
    console.error('AWS SES send failed:', err.message);
    console.error('Root cause:', err.cause);
  }
}
```

---

## Usage Examples

### Express.js

```ts
// app.ts
import express from 'express';
import { init } from '@fmontoya/aws-ses-adapter';

init(); // reads credentials from environment variables

const app = express();
app.use(express.json());

app.listen(3000);
```

```ts
// routes/contact.ts
import { Router } from 'express';
import { sendEmail } from '@fmontoya/aws-ses-adapter';

const router = Router();

router.post('/contact', async (req, res) => {
  const { name, email, message } = req.body;

  await sendEmail({
    to: 'support@example.com',
    subject: `Contact form submission from ${name}`,
    html: `<p><strong>From:</strong> ${email}</p><p>${message}</p>`,
    text: `From: ${email}\n\n${message}`,
    replyTo: email,
  });

  res.json({ ok: true });
});

export default router;
```

### NestJS

Create a provider using the `SesAdapter` class directly so it integrates with NestJS's dependency injection:

```ts
// email/email.module.ts
import { Module } from '@nestjs/common';
import { EmailService } from './email.service';

@Module({
  providers: [
    {
      provide: 'SES_ADAPTER',
      useFactory: () => {
        const { SesAdapter } = require('@fmontoya/aws-ses-adapter');
        return new SesAdapter({
          region: process.env.AWS_SES_REGION,
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          defaultFrom: process.env.AWS_SES_FROM_EMAIL,
        });
      },
    },
    EmailService,
  ],
  exports: [EmailService],
})
export class EmailModule {}
```

```ts
// email/email.service.ts
import { Inject, Injectable } from '@nestjs/common';
import type { SesAdapter, SendEmailOptions } from '@fmontoya/aws-ses-adapter';

@Injectable()
export class EmailService {
  constructor(@Inject('SES_ADAPTER') private readonly ses: SesAdapter) {}

  async send(options: SendEmailOptions) {
    return this.ses.sendEmail(options);
  }
}
```

---

## TypeScript Types

All public types are exported from the package root:

```ts
import type {
  SesAdapterConfig,
  SendEmailOptions,
  SendEmailWithAttachmentsOptions,
  EmailAttachment,
  SendEmailResult,
} from '@fmontoya/aws-ses-adapter';
```

---

## License

[MIT](./LICENSE) © [FabianMontoya](https://github.com/FabianMontoya)
