/** Error terstruktur dengan kode yang bisa dilaporkan operator/teknisi. */
export class AppError extends Error {
  readonly code: string
  readonly httpStatus: number
  readonly details: unknown

  constructor(code: string, message: string, httpStatus = 400, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.httpStatus = httpStatus
    this.details = details ?? null
  }
}

export const Errors = {
  validation: (message: string, details?: unknown) =>
    new AppError('VALIDATION', message, 422, details),
  unauthorized: (message = 'Sesi tidak valid atau sudah berakhir.') =>
    new AppError('UNAUTHORIZED', message, 401),
  forbidden: (message = 'Anda tidak memiliki hak akses untuk aksi ini.') =>
    new AppError('FORBIDDEN', message, 403),
  notFound: (code: string, message: string) => new AppError(code, message, 404),
  conflict: (code: string, message: string) => new AppError(code, message, 409),
  invalidState: (message: string) => new AppError('INVALID_STATE', message, 409)
}
