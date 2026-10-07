"use client";

import { useEffect, useState } from "react";
import { Button, ErrorState, Field, PageIntro, Skeleton, useToast } from "../../../components/ui";
import { api, ApiError } from "../../../lib/api";
import type { Role } from "../../../lib/types";

type ListedUser = {
  id: string;
  email: string;
  role: Role;
  created_at: string;
};

export default function UsersPage() {
  const toast = useToast();
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<ListedUser[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", role: "OPERATOR" as Role });
  const [newFields, setNewFields] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<Role>("OPERATOR");
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setError("");
    try {
      const rows = await api<ListedUser[]>("/api/users");
      setUsers(rows);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 403) setForbidden(true);
      else setError(caught instanceof ApiError ? caught.message : "Sem conexão. Os dados precisam de internet.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createUser(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setNewFields({});
    try {
      const created = await api<ListedUser>("/api/users", {
        method: "POST",
        body: JSON.stringify(newUser),
      });
      setUsers((prev) => [...prev, created].sort((a, b) => a.email.localeCompare(b.email)));
      setNewUser({ email: "", password: "", role: "OPERATOR" });
      setShowNew(false);
      toast("Usuário criado.");
    } catch (caught) {
      if (caught instanceof ApiError) {
        setNewFields(caught.fields ?? {});
        toast(caught.message);
      } else toast("Sem conexão. Os dados precisam de internet.");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(user: ListedUser) {
    setEditingId(user.id);
    setEditPassword("");
    setEditRole(user.role);
  }

  async function saveEdit(userId: string) {
    const body: { password?: string; role?: Role } = {};
    if (editPassword.trim()) body.password = editPassword.trim();
    const current = users.find((u) => u.id === userId);
    if (current && editRole !== current.role) body.role = editRole;
    if (!body.password && !body.role) {
      setEditingId(null);
      return;
    }

    setSavingId(userId);
    try {
      const updated = await api<ListedUser>(`/api/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      setEditingId(null);
      toast("Usuário atualizado.");
    } catch (caught) {
      toast(caught instanceof ApiError ? caught.message : "Sem conexão. Os dados precisam de internet.");
    } finally {
      setSavingId(null);
    }
  }

  if (loading) return <Skeleton className="h-64" />;
  if (forbidden) {
    return (
      <div className="mx-auto max-w-xl">
        <PageIntro title="Usuários" />
        <p>Só o administrador gerencia usuários.</p>
      </div>
    );
  }
  if (error) return <ErrorState message={error} />;

  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageIntro title="Usuários" subtitle="Cadastre operadores e outros administradores." />
        <Button type="button" onClick={() => setShowNew((v) => !v)}>
          {showNew ? "Fechar" : "Novo usuário"}
        </Button>
      </div>

      {showNew ? (
        <form className="grid gap-4 rounded-xl border border-line bg-surface p-4" onSubmit={(e) => void createUser(e)}>
          <Field label="E-mail" error={newFields.email}>
            {(id) => (
              <input
                id={id}
                type="email"
                autoComplete="off"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            )}
          </Field>
          <Field label="Senha inicial" hint="Mínimo de 8 caracteres." error={newFields.password}>
            {(id) => (
              <input
                id={id}
                type="password"
                autoComplete="new-password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              />
            )}
          </Field>
          <Field label="Papel" error={newFields.role}>
            {(id) => (
              <select id={id} value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as Role })}>
                <option value="OPERATOR">Operador</option>
                <option value="ADMIN">Administrador</option>
              </select>
            )}
          </Field>
          <Button type="submit" disabled={creating}>
            {creating ? "Salvando…" : "Salvar"}
          </Button>
        </form>
      ) : null}

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="py-2 pr-3 font-semibold">E-mail</th>
              <th className="py-2 pr-3 font-semibold">Papel</th>
              <th className="py-2 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-line align-top">
                <td className="py-3 pr-3">{user.email}</td>
                <td className="py-3 pr-3">{user.role === "ADMIN" ? "Administrador" : "Operador"}</td>
                <td className="py-3">
                  {editingId === user.id ? (
                    <div className="grid max-w-xs gap-2">
                      <Field label="Nova senha" hint="Deixe em branco para não alterar.">
                        {(id) => (
                          <input
                            id={id}
                            type="password"
                            autoComplete="new-password"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                          />
                        )}
                      </Field>
                      <Field label="Papel">
                        {(id) => (
                          <select id={id} value={editRole} onChange={(e) => setEditRole(e.target.value as Role)}>
                            <option value="OPERATOR">Operador</option>
                            <option value="ADMIN">Administrador</option>
                          </select>
                        )}
                      </Field>
                      <div className="flex gap-2">
                        <Button type="button" disabled={savingId === user.id} onClick={() => void saveEdit(user.id)}>
                          {savingId === user.id ? "Salvando…" : "Salvar"}
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button type="button" variant="secondary" onClick={() => startEdit(user)}>
                      Editar
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="grid gap-3 md:hidden">
        {users.map((user) => (
          <li key={user.id} className="rounded-xl border border-line bg-surface p-4">
            <p className="font-semibold">{user.email}</p>
            <p className="text-sm text-muted">{user.role === "ADMIN" ? "Administrador" : "Operador"}</p>
            {editingId === user.id ? (
              <div className="mt-3 grid gap-2">
                <Field label="Nova senha" hint="Deixe em branco para não alterar.">
                  {(id) => (
                    <input
                      id={id}
                      type="password"
                      autoComplete="new-password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                    />
                  )}
                </Field>
                <Field label="Papel">
                  {(id) => (
                    <select id={id} value={editRole} onChange={(e) => setEditRole(e.target.value as Role)}>
                      <option value="OPERATOR">Operador</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  )}
                </Field>
                <div className="flex gap-2">
                  <Button type="button" disabled={savingId === user.id} onClick={() => void saveEdit(user.id)}>
                    {savingId === user.id ? "Salvando…" : "Salvar"}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button type="button" className="mt-3" variant="secondary" onClick={() => startEdit(user)}>
                Editar
              </Button>
            )}
          </li>
        ))}
      </ul>

      {users.length === 0 ? <p className="text-sm text-muted">Nenhum usuário além do administrador inicial.</p> : null}
    </div>
  );
}
