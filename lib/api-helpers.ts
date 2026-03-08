/**
 * API route helpers — centralized error response formatting.
 *
 * Usage:
 *   import { handleApiError, errorResponse } from "@/lib/api-helpers";
 *
 *   // In a catch block:
 *   catch (err) {
 *     return handleApiError(err);
 *   }
 *
 *   // Or build a manual error response:
 *   return errorResponse("Not found", "NOT_FOUND", 404);
 */

import { NextResponse } from "next/server";
import {
  AppError,
  ErrorCodes,
  getSafeErrorMessage,
  getErrorCode,
  getErrorStatus,
  type ErrorCode,
} from "./errors";

/** Structured error response shape returned to the client. */
export interface ApiErrorResponse {
  error: {
    message: string;
    code: ErrorCode;
  };
}

/**
 * Build a structured JSON error response.
 *
 * Use this for known, manual error conditions (e.g. validation failures).
 */
export function errorResponse(
  message: string,
  code: ErrorCode,
  status: number,
  extra?: Record<string, unknown>,
): NextResponse<ApiErrorResponse & Record<string, unknown>> {
  return NextResponse.json(
    {
      error: { message, code },
      ...extra,
    },
    { status },
  );
}

/**
 * Handle any thrown error in an API route catch block.
 *
 * - Logs the full error server-side for debugging.
 * - Returns a clean, structured JSON response to the client.
 * - Never exposes stack traces or secrets.
 */
export function handleApiError(
  err: unknown,
  context?: string,
): NextResponse<ApiErrorResponse> {
  // Log the full error server-side
  if (context) {
    console.error(`[${context}]`, err);
  } else {
    console.error("[api]", err);
  }

  const message = getSafeErrorMessage(err);
  const code = getErrorCode(err);
  const status = getErrorStatus(err);

  return NextResponse.json(
    { error: { message, code } },
    { status },
  );
}
