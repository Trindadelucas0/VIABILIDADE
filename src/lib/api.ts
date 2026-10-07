export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;
  readonly missing?: string[];

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string>,
    missing?: string[],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.missing = missing;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    const headers = new Headers(init?.headers);
    if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    response = await fetch(path, { ...init, headers, credentials: "same-origin", cache: "no-store" });
  } catch {
    throw new ApiError(0, "OFFLINE", "Sem conexão. Os dados precisam de internet.");
  }

  if (response.status === 401 && !path.startsWith("/api/auth/login")) {
    window.location.assign("/login");
    throw new ApiError(401, "UNAUTHENTICATED", "Sessão expirada. Entre novamente.");
  }

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      throw new ApiError(response.status, "INTERNAL", "Não foi possível concluir. Tente novamente.");
    }
  }

  if (!response.ok) {
    const body = data as { error?: { code?: string; message?: string; fields?: Record<string, string>; missing?: string[] } } | null;
    const error = body?.error;
    throw new ApiError(
      response.status,
      error?.code ?? "INTERNAL",
      error?.message ?? "Não foi possível concluir. Tente novamente.",
      error?.fields,
      error?.missing,
    );
  }

  return data as T;
}
