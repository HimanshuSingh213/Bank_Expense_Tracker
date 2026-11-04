export type ApiSuccessResponse<T> = { success: true; data: T };

export type ApiErrorCode =
  | "SESSION_EXPIRED"
  | "INVALID_CREDENTIALS"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PASSWORD_REQUIRED"
  | "INVALID_FILE_PASSWORD"
  | "UNSUPPORTED_FORMAT"
  | "UNSUPPORTED_LAYOUT"
  | "FILE_TOO_LARGE"
  | "TOO_MANY_ROWS"
  | "IMPORT_FAILED"
  | "IMPORT_EXPIRED"
  | "IMPORT_STATE"
  | "AI_UNAVAILABLE"
  | "UPSTREAM_ERROR"
  | "UNKNOWN";

export type ApiErrorResponse = {
  success: false;
  error: string;
  code: ApiErrorCode;
  details?: unknown;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
