"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import type { User } from "../lib/types";
import { IconCompare, IconGrid, IconHome, IconPlus, IconSliders, IconUsers } from "./icons";
import { Button, Skeleton, ToastProvider } from "./ui";

const NAV = [
  { href: "/", label: "Início", icon: IconHome, match: (path: string) => path === "/" },
  { href: "/produtos", label: "Produtos", icon: IconGrid, match: (path: string) => path.startsWith("/produtos") && path !== "/produtos/novo" },
  { href: "/produtos/novo", label: "Novo", icon: IconPlus, match: (path: string) => path === "/produtos/novo" },
  { href: "/comparar", label: "Comparar", icon: IconCompare, match: (path: string) => path.startsWith("/comparar") },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    api<User>("/api/auth/me")
      .then((next) => {
        if (active) setUser(next);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <ToastProvider>
      <div className="shell">
        <aside className="sidebar">
          <p className="px-3 text-lg font-semibold">Viabilidade</p>
          <nav className="grid gap-1" aria-label="Principal">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} aria-current={item.match(pathname) ? "page" : undefined}>
                <item.icon />
                {item.label}
              </Link>
            ))}
            {user?.role === "ADMIN" ? (
              <>
                <Link href="/usuarios" aria-current={pathname === "/usuarios" ? "page" : undefined}>
                  <IconUsers />
                  Usuários
                </Link>
                <Link href="/parametros" aria-current={pathname === "/parametros" ? "page" : undefined}>
                  <IconSliders />
                  Parâmetros
                </Link>
              </>
            ) : null}
          </nav>
        </aside>
        <div>
          <header className="flex items-center justify-between gap-3 px-4 pt-4 md:px-10 md:pt-8">
            <p className="text-sm text-muted">{user ? `Olá, ${user.display_name}` : "Viabilidade"}</p>
            <div className="flex items-center gap-2">
              {user?.role === "ADMIN" ? (
                <>
                  <Link className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-ink no-underline lg:hidden" href="/usuarios">
                    Usuários
                  </Link>
                  <Link className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-ink no-underline lg:hidden" href="/parametros">
                    Parâmetros
                  </Link>
                </>
              ) : null}
              <Button variant="ghost" onClick={() => void logout()}>
                Sair
              </Button>
            </div>
          </header>
          <main className="content" id="conteudo">
            {user ? children : failed ? <p>Sem conexão. Os dados precisam de internet.</p> : <Skeleton className="h-40" />}
          </main>
        </div>
        <nav className="tabbar" aria-label="Principal">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} aria-current={item.match(pathname) ? "page" : undefined}>
              <item.icon />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </ToastProvider>
  );
}
