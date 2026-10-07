import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-md content-center gap-6 px-4 py-8">
      <div className="grid gap-1">
        <h1 className="text-3xl font-semibold">Viabilidade</h1>
        <p className="text-sm text-muted">Entre com o e-mail cadastrado.</p>
      </div>
      <LoginForm />
    </main>
  );
}
