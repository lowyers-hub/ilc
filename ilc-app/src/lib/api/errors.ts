export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(args: { message: string; status: number; code?: string; details?: unknown }) {
    super(args.message);
    this.name = 'ApiError';
    this.status = args.status;
    this.code = args.code;
    this.details = args.details;
  }
}

export async function parseApiError(res: Response): Promise<ApiError> {
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    // ignore
  }

  const message =
    body?.error?.message ??
    body?.message ??
    (res.status === 0 ? 'Network error' : `Request failed (${res.status})`);

  return new ApiError({
    message,
    status: res.status,
    code: body?.error?.code,
    details: body?.error?.details ?? body,
  });
}

