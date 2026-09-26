export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly expose: boolean;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    options?: { expose?: boolean; cause?: unknown },
  ) {
    super(message, { cause: options?.cause });
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.expose = options?.expose ?? statusCode < 500;
  }
}
