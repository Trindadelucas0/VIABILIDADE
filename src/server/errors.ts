export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;
  readonly missing?: string[];

  constructor(
    status: number,
    code: string,
    message: string,
    extra?: { fields?: Record<string, string>; missing?: string[] },
  ) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.fields = extra?.fields;
    this.missing = extra?.missing;
  }
}

export function audit(event: string, fields: Record<string, string | number | boolean | null>) {
  console.info(JSON.stringify({ event, ...fields, at: new Date().toISOString() }));
}
