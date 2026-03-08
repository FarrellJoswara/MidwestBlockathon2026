/**
 * Centralized error handling — AppError class and error code constants.
 *
 * All application errors should flow through AppError so that:
 *   - Client responses are short and human-readable
 *   - Server logs contain full debugging information
 *   - Stack traces and secrets are never exposed to the client
 */

// ── Error Codes ──────────────────────────────────────────────────────────────

export const ErrorCodes = {
  // Gemini
  MISSING_GEMINI_KEY: "MISSING_GEMINI_KEY",
  GEMINI_AUTH_FAILED: "GEMINI_AUTH_FAILED",
  GEMINI_RATE_LIMIT: "GEMINI_RATE_LIMIT",
  GEMINI_NETWORK_ERROR: "GEMINI_NETWORK_ERROR",
  GEMINI_RESPONSE_INVALID: "GEMINI_RESPONSE_INVALID",
  GEMINI_REQUEST_FAILED: "GEMINI_REQUEST_FAILED",

  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",

  // Auth
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",

  // Resources
  NOT_FOUND: "NOT_FOUND",

  // External services
  IPFS_UPLOAD_FAILED: "IPFS_UPLOAD_FAILED",
  IPFS_FETCH_FAILED: "IPFS_FETCH_FAILED",
  IPFS_NOT_CONFIGURED: "IPFS_NOT_CONFIGURED",
  COMPILATION_FAILED: "COMPILATION_FAILED",
  DEPLOY_FAILED: "DEPLOY_FAILED",
  DECRYPTION_FAILED: "DECRYPTION_FAILED",

  // Environment
  MISSING_ENV_VAR: "MISSING_ENV_VAR",

  // Catch-all
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ── AppError ─────────────────────────────────────────────────────────────────

/**
 * Structured application error.
 *
 * @param message - Short, human-readable message safe to show to the client.
 * @param code    - Machine-readable error code (see ErrorCodes).
 * @param status  - HTTP status code for API responses.
 * @param expose  - If true, the message is safe to expose to the client.
 *                  If false, a generic message is returned instead.
 */
export class AppError extends Error {
  code: ErrorCode;
  status: number;
  expose: boolean;

  constructor(
    message: string,
    code: ErrorCode = ErrorCodes.INTERNAL_ERROR,
    status = 500,
    expose = true,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.expose = expose;
  }
}

/**
 * Determine the safe client-facing message for an error.
 * AppErrors with `expose: true` show their message; everything else gets a generic fallback.
 */
export function getSafeErrorMessage(err: unknown): string {
  if (err instanceof AppError && err.expose) {
    return err.message;
  }
  return "An unexpected error occurred. Please try again later.";
}

/**
 * Extract an error code from an error. Falls back to INTERNAL_ERROR for non-AppErrors.
 */
export function getErrorCode(err: unknown): ErrorCode {
  if (err instanceof AppError) {
    return err.code;
  }
  return ErrorCodes.INTERNAL_ERROR;
}

/**
 * Extract an HTTP status from an error. Falls back to 500 for non-AppErrors.
 */
export function getErrorStatus(err: unknown): number {
  if (err instanceof AppError) {
    return err.status;
  }
  return 500;
}
