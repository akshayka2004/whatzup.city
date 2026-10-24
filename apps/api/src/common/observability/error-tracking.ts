import * as Sentry from '@sentry/node';

let enabled = false;

/**
 * Sentry error reporting, on only when SENTRY_DSN is set. Started after config
 * loads, so it skips Sentry's auto-instrumentation and just reports errors we
 * hand it plus uncaught exceptions/rejections. No PII: cookies, auth headers and
 * request bodies are never attached.
 */
export function initErrorTracking(opts: { dsn?: string; release?: string; environment?: string }) {
  if (!opts.dsn || enabled) return;
  Sentry.init({
    dsn: opts.dsn,
    release: opts.release,
    environment: opts.environment,
    sendDefaultPii: false,
    defaultIntegrations: false,
    integrations: [
      Sentry.onUncaughtExceptionIntegration(),
      Sentry.onUnhandledRejectionIntegration(),
      Sentry.linkedErrorsIntegration(),
      Sentry.dedupeIntegration(),
    ],
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
        if (event.request.headers) {
          delete event.request.headers.cookie;
          delete event.request.headers.authorization;
        }
      }
      return event;
    },
  });
  enabled = true;
}

export function captureError(
  error: unknown,
  context: { source: string; method?: string; path?: string; extra?: Record<string, unknown> },
) {
  if (!enabled) return;
  Sentry.withScope((scope) => {
    scope.setTag('source', context.source);
    if (context.method) scope.setTag('method', context.method);
    if (context.path) scope.setTag('path', context.path);
    if (context.extra) scope.setExtras(context.extra);
    if (error instanceof Error) Sentry.captureException(error);
    else Sentry.captureMessage(String(error), 'error');
  });
}
