/**
 * Startup script — loads secrets from AWS Secrets Manager if running in AWS,
 * falls back to environment variables for local development.
 *
 * Usage: imported by index.ts before anything else.
 */

interface SecretsPayload {
  PRIVATE_KEY?: string;
  CLOB_API_KEY?: string;
  CLOB_SECRET?: string;
  CLOB_PASSPHRASE?: string;
}

/**
 * Loads secrets from AWS Secrets Manager and injects them into process.env.
 * Only runs when AWS_SECRET_NAME is set (i.e., in AWS environments).
 */
export async function loadSecrets(): Promise<void> {
  const secretName = process.env['AWS_SECRET_NAME'];
  const region = process.env['AWS_REGION'] ?? 'us-east-1';

  if (!secretName) {
    // Local dev — use .env file directly
    console.info('[Startup] AWS_SECRET_NAME not set — using local environment variables.');
    return;
  }

  console.info(`[Startup] Loading secrets from AWS Secrets Manager: ${secretName}`);

  try {
    // Dynamic import so the package is optional in local dev
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const awsSdk = await import('@aws-sdk/client-secrets-manager' as any).catch(() => null);
    if (!awsSdk) {
      console.warn('[Startup] @aws-sdk/client-secrets-manager not installed — skipping Secrets Manager.');
      return;
    }
    const { SecretsManagerClient, GetSecretValueCommand } = awsSdk;

    const client = new SecretsManagerClient({ region });
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await client.send(command);

    if (!response.SecretString) {
      throw new Error('SecretString is empty');
    }

    const secrets = JSON.parse(response.SecretString) as SecretsPayload;

    // Inject into process.env (only if not already set)
    if (secrets.PRIVATE_KEY && !process.env['PRIVATE_KEY']) {
      process.env['PRIVATE_KEY'] = secrets.PRIVATE_KEY;
    }
    if (secrets.CLOB_API_KEY && !process.env['CLOB_API_KEY']) {
      process.env['CLOB_API_KEY'] = secrets.CLOB_API_KEY;
    }
    if (secrets.CLOB_SECRET && !process.env['CLOB_SECRET']) {
      process.env['CLOB_SECRET'] = secrets.CLOB_SECRET;
    }
    if (secrets.CLOB_PASSPHRASE && !process.env['CLOB_PASSPHRASE']) {
      process.env['CLOB_PASSPHRASE'] = secrets.CLOB_PASSPHRASE;
    }

    console.info('[Startup] Secrets loaded successfully from AWS Secrets Manager.');
  } catch (err) {
    console.error('[Startup] Failed to load secrets from AWS Secrets Manager:', err);
    console.error('[Startup] Falling back to environment variables.');
  }
}
