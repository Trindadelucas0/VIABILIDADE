"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Field } from "../../components/ui";
import { loginAction, type LoginState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-accent bg-accent px-4 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Entrando…" : "Entrar"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, null);

  return (
    <form action={formAction} method="post" className="grid gap-4 rounded-xl border border-line bg-surface p-6 md:p-8">
      <Field label="E-mail">
        {(id) => (
          <input id={id} name="email" type="email" autoComplete="username" inputMode="email" required />
        )}
      </Field>
      <Field label="Senha">
        {(id) => (
          <input id={id} name="password" type="password" autoComplete="current-password" required />
        )}
      </Field>
      {state?.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
