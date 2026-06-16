/**
 * Lightweight observability — captures errors to Sentry when SENTRY_DSN is set,
 * always logs to console. Avoids hard dependency on Sentry at build time.
 */

let sentryReady = false;

async function initSentry(): Promise<void> {
  if (sentryReady || !process.env.SENTRY_DSN?.trim()) return;
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.SENTRY_DSN.trim(),
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
      tracesSampleRate: 0.1,
    });
    sentryReady = true;
  } catch {
    /* Sentry optional */
  }
}

export async function captureError(
  err: unknown,
  context?: Record<string, unknown>,
): Promise<void> {
  console.error("[msad]", context?.route ?? "error", err, context);
  await initSentry();
  if (sentryReady) {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(err, { extra: context });
  }
}

export async function captureMessage(
  message: string,
  context?: Record<string, unknown>,
): Promise<void> {
  console.warn("[msad]", message, context);
  await initSentry();
  if (sentryReady) {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureMessage(message, { extra: context });
  }
}
