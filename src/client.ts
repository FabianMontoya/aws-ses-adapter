/**
 * @module client
 * Factory and utilities for building an AWS SESClient instance
 * from a resolved adapter configuration.
 */

import { SESClient } from '@aws-sdk/client-ses';
import type { ResolvedSesAdapterConfig } from './types';

/**
 * Creates and returns a configured {@link SESClient} instance using the
 * resolved adapter configuration.
 *
 * @param config - The resolved configuration containing region and credentials.
 * @returns A ready-to-use AWS SESClient.
 *
 * @example
 * ```ts
 * const client = buildSesClient({
 *   region: 'us-east-1',
 *   accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
 *   secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
 * });
 * ```
 *
 * @internal
 */
export function buildSesClient(config: ResolvedSesAdapterConfig): SESClient {
  return new SESClient({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}
