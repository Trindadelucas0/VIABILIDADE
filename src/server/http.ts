import { ZodError } from "zod";
import { NextResponse } from "next/server";
import { AppError } from "./errors";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function errorBody(
  code: string,
  message: string,
  extra?: { fields?: Record<string, string>; missing?: string[] },
) {
  return {
    error: {
      code,
      message,
      ...(extra?.fields ? { fields: extra.fields } : {}),
      ...(extra?.missing ? { missing: extra.missing } : {}),
    },
  };
}

export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof AppError) {
      return json(
        errorBody(error.code, error.message, { fields: error.fields, missing: error.missing }),
        error.status,
      );
    }
    if (error instanceof ZodError) {
      const fields: Record<string, string> = {};
      for (const issue of error.issues) {
        const key = issue.path.join(".") || "body";
        fields[key] = issue.message;
      }
      return json(errorBody("VALIDATION", "Revise os campos.", { fields }), 422);
    }
    const message = error instanceof Error ? error.message : "erro";
    console.error(JSON.stringify({ event: "unhandled", message }));
    return json(errorBody("INTERNAL", "Não foi possível concluir. Tente novamente."), 500);
  }
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const host = request.headers.get("host");
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new AppError(403, "FORBIDDEN", "Origem não permitida.");
  }
  if (!host || originHost !== host) {
    throw new AppError(403, "FORBIDDEN", "Origem não permitida.");
  }
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError(422, "VALIDATION", "Corpo da requisição inválido.");
  }
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first && /^[a-zA-Z0-9:.]{1,64}$/.test(first)) return first;
  return "local";
}
