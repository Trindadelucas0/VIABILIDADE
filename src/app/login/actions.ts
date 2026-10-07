"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signInWithPassword } from "../../server/auth/sign-in";
import { setSessionCookie } from "../../server/auth/session";
import { AppError } from "../../server/errors";

export type LoginState = { error?: string } | null;

function clientIpFromHeaders(headerList: Headers): string {
  const forwarded = headerList.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first && /^[a-zA-Z0-9:.]{1,64}$/.test(first)) return first;
  return "local";
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const ip = clientIpFromHeaders(await headers());

  try {
    const { token } = await signInWithPassword(email, password, ip);
    await setSessionCookie(token);
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message };
    }
    throw error;
  }

  redirect("/");
}
