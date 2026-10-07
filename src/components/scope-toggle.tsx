"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function ScopeToggle() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const scope = params.get("scope") === "mine" ? "mine" : "all";

  function setScope(next: "all" | "mine") {
    const query = new URLSearchParams(params.toString());
    if (next === "all") query.delete("scope");
    else query.set("scope", "mine");
    query.delete("page");
    const suffix = query.toString();
    router.replace(suffix ? `${pathname}?${suffix}` : pathname);
  }

  return (
    <div className="flex gap-2" role="group" aria-label="Escopo">
      <button
        type="button"
        className={`min-h-11 rounded-full px-4 font-semibold ${scope === "all" ? "bg-accent text-white" : "bg-surface text-ink border border-line"}`}
        aria-pressed={scope === "all"}
        onClick={() => setScope("all")}
      >
        Todos
      </button>
      <button
        type="button"
        className={`min-h-11 rounded-full px-4 font-semibold ${scope === "mine" ? "bg-accent text-white" : "bg-surface text-ink border border-line"}`}
        aria-pressed={scope === "mine"}
        onClick={() => setScope("mine")}
      >
        Meus
      </button>
    </div>
  );
}
